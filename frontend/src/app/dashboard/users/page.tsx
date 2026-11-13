"use client";

import {
  AlertTriangle,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Lock,
  Mail,
  Phone,
  RotateCcw,
  Shield,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import styles from "./page.module.css";

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

export type InvitationItem = {
  id: string;
  role: "teacher" | "admin";
  recipientType: "email" | "phone";
  recipient: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  createdAt: string;
  expiresAt: string;
};

export type UserListItem = {
  id: string;
  role: "visitor" | "teacher" | "admin";
  status: "active" | "disabled";
  displayName: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  lastSignedInAt: string | null;
};

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const prefix = "gk_csrf=";
  const match = document.cookie.split("; ").find((c) => c.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function UsersLoading({ label }: { label: string }) {
  return (
    <div className={styles.loadingState} role="status" aria-live="polite">
      <span className={styles.loadingDot} />
      <span className={styles.loadingDot} />
      <span className={styles.loadingDot} />
      <span>{label}</span>
    </div>
  );
}

function UsersDashboardContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [activeTab, setActiveTab] = useState<"invitations" | "users">("invitations");

  // Invitations state
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [invitationsError, setInvitationsError] = useState<string | null>(null);
  const [invitationsReauth, setInvitationsReauth] = useState(false);

  // Users state
  const [usersList, setUsersList] = useState<UserListItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  // Create form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [recipientType, setRecipientType] = useState<"email" | "phone">("email");
  const [recipient, setRecipient] = useState("");
  const [role, setRole] = useState<"teacher" | "admin">("teacher");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formReauth, setFormReauth] = useState(false);

  // Success invite link state
  const [newInviteLink, setNewInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Revoke confirm state
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  // Fetch invitations
  async function loadInvitations(signal?: AbortSignal) {
    setInvitationsLoading(true);
    setInvitationsError(null);
    setInvitationsReauth(false);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/users/invitations?limit=50&offset=0`, {
        credentials: "include",
        cache: "no-store",
        signal,
      });

      if (!res.ok) {
        if (res.status === 403) {
          const body = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
          if (body.code === "reauthentication_required") {
            setInvitationsReauth(true);
            setInvitationsError("Recent identity confirmation is required to manage invitations.");
            return;
          }
          setInvitationsError(body.message || "You do not have permission to view invitations.");
          return;
        }
        setInvitationsError("Could not load invitations. Please try again.");
        return;
      }

      const data = (await res.json()) as { items: InvitationItem[] };
      setInvitations(data.items || []);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setInvitationsError("Could not connect to the service. Please try again.");
    } finally {
      setInvitationsLoading(false);
    }
  }

  // Fetch users
  async function loadUsers(signal?: AbortSignal) {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/users?limit=50&offset=0`, {
        credentials: "include",
        cache: "no-store",
        signal,
      });

      if (!res.ok) {
        if (res.status === 403) {
          setUsersError("You do not have permission to view users.");
          return;
        }
        setUsersError("Could not load users. Please try again.");
        return;
      }

      const data = (await res.json()) as { items: UserListItem[] };
      setUsersList(data.items || []);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setUsersError("Could not connect to the service. Please try again.");
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    loadInvitations(controller.signal);
    return () => controller.abort();
  }, [isAdmin]);

  function switchTab(tab: "invitations" | "users") {
    setActiveTab(tab);
    if (tab === "users" && usersList.length === 0 && !usersLoading) {
      loadUsers();
    }
  }

  async function handleCreateInvitation(event: FormEvent) {
    event.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    setFormReauth(false);

    const csrf = getCsrfToken();
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/users/invitations`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRF-Token": csrf } : {}),
        },
        body: JSON.stringify({
          recipientType,
          recipient: recipient.trim(),
          role,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          code?: string;
          message?: string | string[];
        };
        if (res.status === 403 && body.code === "reauthentication_required") {
          setFormReauth(true);
          setFormError("Recent authentication is required. Please confirm your identity.");
          return;
        }
        const errorMsg = Array.isArray(body.message)
          ? body.message.join(", ")
          : body.message || "Failed to create invitation.";
        setFormError(errorMsg);
        return;
      }

      const result = (await res.json()) as { token: string };
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const inviteUrl = `${origin}/account#invite=${encodeURIComponent(result.token)}`;
      setNewInviteLink(inviteUrl);
      setRecipient("");
      setIsFormOpen(false);
      loadInvitations();
    } catch {
      setFormError("Failed to send invitation. Please check your network and try again.");
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleRevokeInvitation(id: string) {
    setRevokingId(id);
    setInvitationsError(null);
    setInvitationsReauth(false);

    const csrf = getCsrfToken();
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/users/invitations/${id}`, {
        method: "DELETE",
        credentials: "include",
        cache: "no-store",
        headers: {
          ...(csrf ? { "X-CSRF-Token": csrf } : {}),
        },
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          code?: string;
          message?: string;
        };
        if (res.status === 403 && body.code === "reauthentication_required") {
          setInvitationsReauth(true);
          setInvitationsError("Recent identity confirmation is required to revoke invitations.");
          return;
        }
        setInvitationsError(body.message || "Failed to revoke invitation.");
        return;
      }

      setConfirmRevokeId(null);
      loadInvitations();
    } catch {
      setInvitationsError("Could not complete revocation. Please try again.");
    } finally {
      setRevokingId(null);
    }
  }

  function copyToClipboard(text: string) {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  }

  if (!isAdmin) {
    return (
      <main className={styles.container}>
        <section className={styles.errorState} role="alert">
          <ShieldAlert className={styles.errorIcon} size={24} aria-hidden="true" />
          <div className={styles.errorContent}>
            <h2 className={styles.errorTitle}>Access Restricted</h2>
            <p className={styles.errorText}>
              User and invitation administration is restricted to platform administrators.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.titleMark} aria-hidden="true">
            <Users />
          </div>
          <div>
            <h1 className={styles.heading}>Users & Invitations</h1>
            <p className={styles.subtitle}>
              Invite and onboard teachers or administrators, and inspect platform users.
            </p>
          </div>
        </div>

        {activeTab === "invitations" && !isFormOpen && (
          <button
            type="button"
            className={styles.primaryAction}
            onClick={() => {
              setIsFormOpen(true);
              setNewInviteLink(null);
            }}
          >
            <UserPlus size={18} aria-hidden="true" /> Invite teacher or admin
          </button>
        )}
      </header>

      {/* Generated invitation link success announcement */}
      {newInviteLink && (
        <section className={styles.tokenCard} aria-live="polite">
          <div className={styles.tokenHeader}>
            <Check size={20} aria-hidden="true" />
            <span>Invitation Created Successfully</span>
          </div>
          <p className={styles.tokenText}>
            Send this one-time invite link to the recipient. When they open it and sign in (via
            Google or Phone), their account will automatically be granted the assigned role.
          </p>
          <div className={styles.tokenRow}>
            <input
              type="text"
              readOnly
              value={newInviteLink}
              className={styles.tokenInput}
              aria-label="Invitation link"
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              className={styles.copyButton}
              onClick={() => copyToClipboard(newInviteLink)}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        </section>
      )}

      {/* Inline Create Invitation Form */}
      {isFormOpen && (
        <section className={styles.formCard} aria-label="Create invitation form">
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Invite a New Teacher or Admin</h2>
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setIsFormOpen(false)}
              aria-label="Cancel and close form"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleCreateInvitation}>
            <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label htmlFor="invite-role" className={styles.fieldLabel}>
                  Role to assign
                </label>
                <select
                  id="invite-role"
                  className={styles.selectInput}
                  value={role}
                  onChange={(e) => setRole(e.target.value as "teacher" | "admin")}
                >
                  <option value="teacher">Teacher (Scientific contributor)</option>
                  <option value="admin">Administrator (Full operational access)</option>
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="invite-recipient-type" className={styles.fieldLabel}>
                  Delivery channel
                </label>
                <select
                  id="invite-recipient-type"
                  className={styles.selectInput}
                  value={recipientType}
                  onChange={(e) => {
                    setRecipientType(e.target.value as "email" | "phone");
                    setRecipient("");
                  }}
                >
                  <option value="email">Email address</option>
                  <option value="phone">Phone number (E.164)</option>
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="invite-recipient" className={styles.fieldLabel}>
                  {recipientType === "email" ? "Recipient email" : "Recipient phone (+964...)"}
                </label>
                <input
                  id="invite-recipient"
                  type={recipientType === "email" ? "email" : "tel"}
                  required
                  placeholder={
                    recipientType === "email" ? "colleague@example.org" : "+9647501234567"
                  }
                  className={styles.textInput}
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
              </div>
            </div>

            {formError && (
              <div style={{ marginTop: 14 }}>
                <section className={styles.errorState} role="alert">
                  <AlertTriangle className={styles.errorIcon} size={20} aria-hidden="true" />
                  <div className={styles.errorContent}>
                    <p className={styles.errorText}>{formError}</p>
                    {formReauth && (
                      <Link
                        href={`/account?returnTo=${encodeURIComponent("/dashboard/users")}`}
                        className={styles.reauthLink}
                      >
                        Confirm identity <ExternalLink size={14} aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </section>
              </div>
            )}

            <div className={styles.formActions}>
              <button type="submit" className={styles.primaryAction} disabled={formSubmitting}>
                {formSubmitting ? "Generating invitation…" : "Create & generate link"}
              </button>
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={() => setIsFormOpen(false)}
                disabled={formSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Tabs */}
      <nav className={styles.tabNav} aria-label="Users and Invitations navigation">
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "invitations" ? styles.tabButtonActive : ""}`}
          onClick={() => switchTab("invitations")}
          aria-selected={activeTab === "invitations"}
          role="tab"
        >
          <Mail size={16} aria-hidden="true" /> Invitations
          {invitations.length > 0 && (
            <span className={styles.tabBadge}>{invitations.length}</span>
          )}
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "users" ? styles.tabButtonActive : ""}`}
          onClick={() => switchTab("users")}
          aria-selected={activeTab === "users"}
          role="tab"
        >
          <UserCheck size={16} aria-hidden="true" /> Users
          {usersList.length > 0 && (
            <span className={styles.tabBadge}>{usersList.length}</span>
          )}
        </button>
      </nav>

      {/* Tab: Invitations */}
      {activeTab === "invitations" && (
        <section aria-label="Invitations list">
          {invitationsLoading && <UsersLoading label="Loading invitations…" />}

          {!invitationsLoading && invitationsError && (
            <section className={styles.errorState} role="alert">
              <AlertTriangle className={styles.errorIcon} size={24} aria-hidden="true" />
              <div className={styles.errorContent}>
                <h2 className={styles.errorTitle}>Could not load invitations</h2>
                <p className={styles.errorText}>{invitationsError}</p>
                {invitationsReauth && (
                  <Link
                    href={`/account?returnTo=${encodeURIComponent("/dashboard/users")}`}
                    className={styles.reauthLink}
                  >
                    Confirm identity <ExternalLink size={14} aria-hidden="true" />
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => loadInvitations()}
                  className={styles.secondaryAction}
                  style={{ marginTop: 8 }}
                >
                  <RotateCcw size={16} aria-hidden="true" /> Retry
                </button>
              </div>
            </section>
          )}

          {!invitationsLoading && !invitationsError && invitations.length === 0 && (
            <section className={styles.emptyState}>
              <h2 className={styles.emptyTitle}>No invitations found</h2>
              <p className={styles.emptyText}>
                No invitations have been created yet. Generate an invitation to onboard a teacher
                or administrator without requiring a pre-existing account.
              </p>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={() => setIsFormOpen(true)}
              >
                <UserPlus size={16} aria-hidden="true" /> Create first invitation
              </button>
            </section>
          )}

          {!invitationsLoading && !invitationsError && invitations.length > 0 && (
            <div className={styles.listContainer}>
              {invitations.map((inv) => (
                <article key={inv.id} className={styles.card}>
                  <div className={styles.cardMain}>
                    <div className={styles.cardHeader}>
                      <h3 className={styles.cardRecipient}>
                        {inv.recipientType === "phone" ? (
                          <Phone size={14} style={{ display: "inline", marginInlineEnd: 6 }} />
                        ) : (
                          <Mail size={14} style={{ display: "inline", marginInlineEnd: 6 }} />
                        )}
                        {inv.recipient}
                      </h3>
                      <span
                        className={`${styles.badge} ${
                          inv.role === "admin" ? styles.badgeAdmin : styles.badgeTeacher
                        }`}
                      >
                        {inv.role === "admin" ? (
                          <Shield size={10} aria-hidden="true" />
                        ) : undefined}
                        {inv.role}
                      </span>
                      <span
                        className={`${styles.badge} ${
                          inv.status === "pending"
                            ? styles.badgePending
                            : inv.status === "accepted"
                              ? styles.badgeAccepted
                              : inv.status === "expired"
                                ? styles.badgeExpired
                                : styles.badgeRevoked
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>

                    <div className={styles.cardMeta}>
                      <span>Created {formatDate(inv.createdAt)}</span>
                      <span>Expires {formatDate(inv.expiresAt)}</span>
                    </div>
                  </div>

                  <div className={styles.cardActions}>
                    {inv.status === "pending" && (
                      <>
                        {confirmRevokeId === inv.id ? (
                          <div className={styles.confirmRevokeRow}>
                            <button
                              type="button"
                              className={styles.confirmYesButton}
                              disabled={revokingId === inv.id}
                              onClick={() => handleRevokeInvitation(inv.id)}
                            >
                              {revokingId === inv.id ? "Revoking…" : "Yes, revoke"}
                            </button>
                            <button
                              type="button"
                              className={styles.confirmNoButton}
                              disabled={revokingId === inv.id}
                              onClick={() => setConfirmRevokeId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className={styles.revokeButton}
                            onClick={() => setConfirmRevokeId(inv.id)}
                          >
                            Revoke
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tab: Users */}
      {activeTab === "users" && (
        <section aria-label="Users list">
          {usersLoading && <UsersLoading label="Loading users…" />}

          {!usersLoading && usersError && (
            <section className={styles.errorState} role="alert">
              <AlertTriangle className={styles.errorIcon} size={24} aria-hidden="true" />
              <div className={styles.errorContent}>
                <h2 className={styles.errorTitle}>Could not load users</h2>
                <p className={styles.errorText}>{usersError}</p>
                <button
                  type="button"
                  onClick={() => loadUsers()}
                  className={styles.secondaryAction}
                  style={{ marginTop: 8 }}
                >
                  <RotateCcw size={16} aria-hidden="true" /> Retry
                </button>
              </div>
            </section>
          )}

          {!usersLoading && !usersError && usersList.length === 0 && (
            <section className={styles.emptyState}>
              <h2 className={styles.emptyTitle}>No users registered</h2>
              <p className={styles.emptyText}>There are no users registered on the platform yet.</p>
            </section>
          )}

          {!usersLoading && !usersError && usersList.length > 0 && (
            <div className={styles.listContainer}>
              {usersList.map((usr) => (
                <article key={usr.id} className={styles.card}>
                  <div className={styles.cardMain}>
                    <div className={styles.cardHeader}>
                      <h3 className={styles.cardRecipient}>
                        {usr.displayName || usr.email || usr.phone || "Unnamed user"}
                      </h3>
                      <span
                        className={`${styles.badge} ${
                          usr.role === "admin"
                            ? styles.badgeAdmin
                            : usr.role === "teacher"
                              ? styles.badgeTeacher
                              : styles.badgeVisitor
                        }`}
                      >
                        {usr.role === "admin" ? (
                          <Shield size={10} aria-hidden="true" />
                        ) : undefined}
                        {usr.role}
                      </span>
                      <span
                        className={`${styles.badge} ${
                          usr.status === "active" ? styles.badgeActive : styles.badgeDisabled
                        }`}
                      >
                        {usr.status}
                      </span>
                    </div>

                    <div className={styles.cardMeta}>
                      {usr.email && <span>Email: {usr.email}</span>}
                      {usr.phone && <span>Phone: {usr.phone}</span>}
                      <span>Joined {formatDate(usr.createdAt)}</span>
                      {usr.lastSignedInAt && (
                        <span>Last active {formatDate(usr.lastSignedInAt)}</span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export default function DashboardUsersPage() {
  return (
    <Suspense fallback={<UsersLoading label="Loading users workspace…" />}>
      <UsersDashboardContent />
    </Suspense>
  );
}
