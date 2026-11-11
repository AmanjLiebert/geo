import { createHash } from 'node:crypto';

export interface CuratedImageSource {
  key: string;
  filename: string;
  title: string;
  sourceUrl: string;
  creator: string;
  licence: string;
  rightsStatement: string;
}

export interface CuratedScientificRecord {
  key: string;
  category: string;
  recordType: string;
  title: string;
  summary: string;
  description: string;
  attributes: Record<string, unknown>;
  image: string;
  imageCaption: string;
  imageDescription: string;
  imageAltText: string;
}

export const CURATED_IMAGE_SOURCES: CuratedImageSource[] = [
  image(
    'rawandiz-canyon',
    'atlas/rawandiz-canyon.jpg',
    'Rawandiz Canyon (Kharand) 01',
    'https://commons.wikimedia.org/wiki/File:Rawandiz_Canyon_(Kharand)_01.jpg',
    'Khoshhat',
    'CC BY 4.0',
  ),
  image(
    'rawandiz-ridge',
    'atlas/rawandiz-ridge.jpg',
    'Rawandiz Canyon (Kharand) 02',
    'https://commons.wikimedia.org/wiki/File:Rawandiz_Canyon_(Kharand)_02.jpg',
    'Khoshhat',
    'CC BY 4.0',
  ),
  image(
    'rawandiz-road',
    'atlas/rawandiz-road.jpg',
    'Rawandiz Canyon (Kharand) 03',
    'https://commons.wikimedia.org/wiki/File:Rawandiz_Canyon_(Kharand)_03.jpg',
    'Khoshhat',
    'CC BY 4.0',
  ),
  image(
    'rawandiz-valley',
    'atlas/rawandiz-valley.jpg',
    'Rawandiz Canyon (Kharand) 05',
    'https://commons.wikimedia.org/wiki/File:Rawandiz_Canyon_(Kharand)_05.jpg',
    'Khoshhat',
    'CC BY 4.0',
  ),
  image(
    'bradost',
    'atlas/bradost-mountain.jpg',
    'Bradost Mountain, Erbil',
    'https://commons.wikimedia.org/wiki/File:Bradost_Mountain,_Erbil.jpg',
    'Sarchia Khursheed',
    'CC BY-SA 4.0',
  ),
  image(
    'korek',
    'atlas/korek-mountain.jpg',
    'Korek Mountain in Kurdistan Iraq',
    'https://commons.wikimedia.org/wiki/File:Korek_Mountain_in_Kurdistan_Iraq.jpg',
    'Alli Khalil',
    'CC BY-SA 4.0',
  ),
  image(
    'halgurd',
    'atlas/halgurd-mountain.jpg',
    'Halgurd Mountain, Kurdistan Region of Iraq',
    'https://commons.wikimedia.org/wiki/File:Halgurd_Mountain_Halgurd_national_park_highest_pick_of_mountain_3607_meter_Kurdistan_region_government_Iraq.jpg',
    'Kawasuurdawoody',
    'CC BY-SA 4.0',
  ),
  image(
    'gali-ali-beg',
    'atlas/gali-ali-beg.jpg',
    'Gali Ali Beg waterfall in Erbil 01',
    'https://commons.wikimedia.org/wiki/File:Gali_Ali_Beg_waterfall_in_Erbil,_the_Kurdistan_Region_of_Iraq_01.jpg',
    'Levi Clancy',
    'CC BY-SA 4.0',
  ),
  image(
    'bekhal',
    'atlas/bekhal-waterfall.jpg',
    'Bekhal Waterfall 02',
    'https://commons.wikimedia.org/wiki/File:.Bekhal_Waterfall_02.jpg',
    'Khoshhat',
    'CC BY 4.0',
  ),
  image(
    'shanidar',
    'atlas/shanidar-cave.jpg',
    'Shanidar Cave overview',
    'https://commons.wikimedia.org/wiki/File:Shanidar_Cave_-_overview.jpg',
    'Hardscarf',
    'CC BY-SA 4.0',
  ),
  image(
    'zagros',
    'atlas/zagros-satellite.jpg',
    'Zagros Mountains salt-dome satellite image',
    'https://commons.wikimedia.org/wiki/File:ZagrosMtns_SaltDome_ISS012-E-18774.jpg',
    'NASA',
    'Public domain',
  ),
  image(
    'dukan',
    'atlas/dukan-dam.jpg',
    'Dukan Dam',
    'https://commons.wikimedia.org/wiki/File:Dukan_Dam.jpg',
    'U.S. Army Corps of Engineers',
    'Public domain',
  ),
  image(
    'folded-strata',
    'catalog/folded-strata.jpg',
    'Chert Compression Fold',
    'https://commons.wikimedia.org/wiki/File:Chert_Compression_Fold_(9940472926).jpg',
    'Oregon Caves',
    'CC BY 2.0',
  ),
  image(
    'rock-outcrop',
    'catalog/rock-outcrop.jpg',
    'Rock Outcrop',
    'https://commons.wikimedia.org/wiki/File:Rock_Outcrop_-_geograph.org.uk_-_659440.jpg',
    'Anne Burgess',
    'CC BY-SA 2.0',
  ),
  image(
    'ammonite',
    'catalog/ammonite.jpg',
    'Ammonite fossil 25–45 mm',
    'https://commons.wikimedia.org/wiki/File:Ammonite-fossil-25-45mm.jpg',
    'Linas Juozėnas',
    'CC BY-SA 4.0',
  ),
];

export const CURATED_SCIENTIFIC_RECORDS: CuratedScientificRecord[] = [
  ...rawandizSet(
    'rawandiz-canyon',
    'Rawandiz Canyon overview',
    'steep-walled canyon',
    'A broad view into Rawandiz Canyon showing the incised valley and exposed slopes.',
  ),
  ...rawandizSet(
    'rawandiz-ridge',
    'Rawandiz ridge overview',
    'rocky mountain ridge',
    'A regional view of a prominent ridge and the adjacent canyon landscape near Rawandiz.',
  ),
  ...rawandizSet(
    'rawandiz-road',
    'Rawandiz road-cut corridor',
    'incised mountain corridor',
    'A landscape view along the Rawandiz canyon road corridor, with exposed rock faces visible at distance.',
  ),
  ...rawandizSet(
    'rawandiz-valley',
    'Rawandiz valley overview',
    'mountain valley',
    'A broad landscape view of the Rawandiz valley and its bounding slopes.',
  ),
  ...landformPair(
    'bradost',
    'Bradost Mountain landscape',
    'mountain ridge',
    'A regional landscape view of Bradost Mountain in Erbil Governorate.',
  ),
  ...landformPair(
    'korek',
    'Korek Mountain landscape',
    'mountain ridge',
    'A regional landscape view of Korek Mountain in the Kurdistan Region of Iraq.',
  ),
  ...landformPair(
    'halgurd',
    'Halgurd Mountain landscape',
    'high mountain ridge',
    'A regional landscape view of Halgurd Mountain in the Kurdistan Region of Iraq.',
  ),
  ...landformPair(
    'gali-ali-beg',
    'Gali Ali Beg gorge landscape',
    'waterfall gorge',
    'A landscape view of the Gali Ali Beg waterfall and its enclosing gorge.',
  ),
  ...landformPair(
    'bekhal',
    'Bekhal waterfall landscape',
    'waterfall valley',
    'A landscape view of Bekhal Waterfall and the surrounding rock slopes.',
  ),
  {
    key: 'shanidar-landform',
    category: 'karst_erosional_landforms',
    recordType: 'landform_profile',
    title: 'Shanidar Cave entrance landform',
    summary: 'Photo-based observation of the visible cave entrance and surrounding cliff.',
    description: caveDescription(),
    attributes: {
      feature_kind: 'cave entrance',
      morphology:
        'A large recess is visible at the base of a steep rock face. Dimensions and genesis require field verification.',
    },
    image: 'shanidar',
    imageCaption: 'Overview of the Shanidar Cave entrance.',
    imageDescription: caveDescription(),
    imageAltText: 'Wide view of the Shanidar Cave entrance beneath a steep rocky cliff.',
  },
  {
    key: 'shanidar-outcrop',
    category: 'karst_erosional_landforms',
    recordType: 'outcrop_observation',
    title: 'Shanidar Cave cliff reconnaissance',
    summary: 'Image-based reconnaissance note for the rock face around Shanidar Cave.',
    description: caveDescription(),
    attributes: {
      observation_notes:
        'The source image shows an extensive exposed rock face around the cave entrance. Lithology, bedding and weathering have not been classified from the photograph.',
    },
    image: 'shanidar',
    imageCaption: 'Rock face surrounding the Shanidar Cave entrance.',
    imageDescription: caveDescription(),
    imageAltText: 'Rock cliff and vegetation around the entrance to Shanidar Cave.',
  },
  structuralRecord(
    'shanidar-discontinuity-review',
    'joints_fractures',
    'Shanidar Cave discontinuity review',
    'visible rock-mass discontinuities',
    'The cave photograph contains visible rock-surface breaks that may be suitable for later field mapping; no orientation or genetic interpretation is assigned.',
    'shanidar',
  ),
  structuralRecord(
    'zagros-fold-pattern',
    'folds',
    'Zagros regional fold-pattern reconnaissance',
    'regional fold pattern',
    'Satellite imagery shows repeated elongated ridge patterns at regional scale. This entry records only the visible pattern and requires geological map correlation.',
    'zagros',
  ),
  {
    key: 'zagros-salt-dome-landform',
    category: 'karst_erosional_landforms',
    recordType: 'landform_profile',
    title: 'Zagros salt-dome surface expression',
    summary: 'Remote-sensing observation of the landform visible in the NASA satellite image.',
    description: reconnaissance(
      'NASA satellite image of a salt-dome landscape in the Zagros Mountains',
    ),
    attributes: {
      feature_kind: 'salt-dome landscape',
      morphology:
        'A rounded, high-contrast surface feature and surrounding folded terrain are visible in the satellite image; scale and boundaries require map-based verification.',
    },
    image: 'zagros',
    imageCaption: 'NASA satellite view of a Zagros salt-dome landscape.',
    imageDescription: reconnaissance(
      'NASA satellite image of a salt-dome landscape in the Zagros Mountains',
    ),
    imageAltText:
      'Satellite view of folded terrain and a salt-dome landform in the Zagros Mountains.',
  },
  {
    key: 'dukan-shoreline-landform',
    category: 'karst_erosional_landforms',
    recordType: 'landform_profile',
    title: 'Dukan reservoir shoreline landscape',
    summary: 'Photo-based observation of the visible reservoir-margin landform at Dukan.',
    description: reconnaissance(
      'archival photograph of Dukan Dam and the adjacent reservoir margin',
    ),
    attributes: {
      feature_kind: 'reservoir shoreline',
      morphology:
        'The image shows an engineered dam and adjoining steep reservoir margins. Natural landform boundaries and materials require field verification.',
    },
    image: 'dukan',
    imageCaption: 'Dukan Dam and adjacent reservoir margin.',
    imageDescription: reconnaissance(
      'archival photograph of Dukan Dam and the adjacent reservoir margin',
    ),
    imageAltText: 'Dukan Dam beside steep rocky slopes and reservoir water.',
  },
  {
    key: 'dukan-outcrop-review',
    category: 'sedimentary_rocks',
    recordType: 'outcrop_observation',
    title: 'Dukan reservoir slope reconnaissance',
    summary: 'Image-based reconnaissance note for visible rock slopes near Dukan Dam.',
    description: reconnaissance('archival photograph of Dukan Dam and nearby rock slopes'),
    attributes: {
      observation_notes:
        'Rock slopes are visible in the source photograph, but distance and image resolution do not support a lithological or structural classification.',
    },
    image: 'dukan',
    imageCaption: 'Rock slopes visible beside Dukan Dam.',
    imageDescription: reconnaissance('archival photograph of Dukan Dam and nearby rock slopes'),
    imageAltText: 'Distant exposed rock slopes beside Dukan Dam and reservoir water.',
  },
  {
    key: 'dukan-margin-deposit-review',
    category: 'surficial_deposits',
    recordType: 'surficial_unit_profile',
    title: 'Dukan reservoir-margin deposit review',
    summary: 'Provisional image-based entry for later field logging of reservoir-margin material.',
    description: reconnaissance('archival photograph of the Dukan reservoir margin'),
    attributes: {
      deposit_name: 'Dukan reservoir-margin deposits (provisional)',
      deposit_material:
        'Material is not determinable from the archival overview image; grain size, sorting and thickness require field description.',
      age_interpretation: 'Not assigned',
    },
    image: 'dukan',
    imageCaption: 'Dukan reservoir margin selected for later deposit logging.',
    imageDescription: reconnaissance('archival photograph of the Dukan reservoir margin'),
    imageAltText: 'Reservoir margin and exposed slopes near Dukan Dam.',
  },
  structuralRecord(
    'fold-reference-feature',
    'folds',
    'Folded chert reference exposure',
    'compression-fold example',
    'The source photograph clearly shows folded layering. It is a reference example outside the Kurdistan collection area and is not evidence for a local occurrence.',
    'folded-strata',
  ),
  {
    key: 'fold-reference-outcrop',
    category: 'sedimentary_rocks',
    recordType: 'outcrop_observation',
    title: 'Folded chert reference outcrop',
    summary: 'External reference image showing strongly folded layered rock.',
    description: externalReference('folded chert exposure'),
    attributes: {
      observation_notes:
        'The image shows tightly folded, laterally continuous layers. It is retained as a comparison reference; locality-specific interpretation must not be transferred to Kurdistan records.',
    },
    image: 'folded-strata',
    imageCaption: 'External reference photograph of folded chert.',
    imageDescription: externalReference('folded chert exposure'),
    imageAltText: 'Close view of thin rock layers folded into tight curves.',
  },
  {
    key: 'rock-outcrop-observation',
    category: 'sedimentary_rocks',
    recordType: 'outcrop_observation',
    title: 'Rock outcrop documentation reference',
    summary: 'External reference image for recording a natural rock exposure.',
    description: externalReference('natural rock outcrop'),
    attributes: {
      observation_notes:
        'A weathered natural rock exposure is visible. Rock type, age and structure are intentionally left unclassified because the image is only a documentation reference.',
    },
    image: 'rock-outcrop',
    imageCaption: 'External reference photograph of a natural rock outcrop.',
    imageDescription: externalReference('natural rock outcrop'),
    imageAltText: 'Weathered rock outcrop surrounded by grass and low vegetation.',
  },
  {
    key: 'rock-material-reference',
    category: 'sedimentary_rocks',
    recordType: 'rock_material_profile',
    title: 'Unclassified rock-material reference',
    summary: 'External reference retained to demonstrate cautious rock-material documentation.',
    description: externalReference('natural rock exposure'),
    attributes: {
      rock_name: 'Unclassified rock material',
      texture: 'Not determined from overview image',
      composition: 'Not determined; hand specimen or field description is required.',
    },
    image: 'rock-outcrop',
    imageCaption: 'External reference outcrop; material remains unclassified.',
    imageDescription: externalReference('natural rock exposure'),
    imageAltText: 'Weathered exposed rock used as an unclassified material reference.',
  },
  {
    key: 'ammonite-specimen-overview',
    category: 'invertebrate_fossils',
    recordType: 'fossil_specimen',
    title: 'Ammonite specimen visual reference',
    summary: 'External comparison image of an ammonite fossil specimen.',
    description: externalReference('ammonite specimen'),
    attributes: {
      identification: 'Ammonite (broad visual identification)',
      repository: 'Not recorded in the image source',
      catalogue_number: 'Not recorded',
    },
    image: 'ammonite',
    imageCaption: 'External comparison image of an ammonite fossil.',
    imageDescription: externalReference('ammonite specimen'),
    imageAltText: 'Small coiled ammonite fossil specimen on a plain background.',
  },
  {
    key: 'ammonite-morphology-reference',
    category: 'invertebrate_fossils',
    recordType: 'fossil_specimen',
    title: 'Ammonite coiling morphology reference',
    summary: 'External comparison entry focused on visible coiled shell form.',
    description: externalReference('ammonite fossil used for visual comparison only'),
    attributes: {
      identification: 'Ammonite; coiled shell morphology visible',
      repository: 'Not recorded in the image source',
      catalogue_number: 'Not recorded',
    },
    image: 'ammonite',
    imageCaption: 'Ammonite specimen showing coiled shell morphology.',
    imageDescription: externalReference('ammonite fossil used for visual comparison only'),
    imageAltText: 'Close view of a coiled ammonite fossil showing spiral shell form.',
  },
];

function image(
  key: string,
  filename: string,
  title: string,
  sourceUrl: string,
  creator: string,
  licence: string,
): CuratedImageSource {
  return {
    key,
    filename,
    title,
    sourceUrl,
    creator,
    licence,
    rightsStatement: `${licence}; attribution required where applicable. Source: ${sourceUrl}`,
  };
}

function rawandizSet(
  imageKey: string,
  label: string,
  featureKind: string,
  visible: string,
): CuratedScientificRecord[] {
  return [
    {
      key: `${imageKey}-landform`,
      category: 'karst_erosional_landforms',
      recordType: 'landform_profile',
      title: `${label} — landform reconnaissance`,
      summary: `Photo-based observation of the visible ${featureKind} near Rawandiz.`,
      description: reconnaissance(visible),
      attributes: {
        feature_kind: featureKind,
        morphology: `${visible} This overview supports landform reconnaissance only; dimensions, materials and origin require field verification.`,
      },
      image: imageKey,
      imageCaption: `${label}, recorded as a landform reconnaissance view.`,
      imageDescription: reconnaissance(visible),
      imageAltText: `${label} showing the visible mountain slopes and valley form.`,
    },
    {
      key: `${imageKey}-outcrop`,
      category: 'karst_erosional_landforms',
      recordType: 'outcrop_observation',
      title: `${label} — exposure reconnaissance`,
      summary:
        'Image-based reconnaissance note for visible rock exposure; no lithology is assigned.',
      description: reconnaissance(visible),
      attributes: {
        observation_notes:
          'Exposed rock slopes are visible at landscape scale. The photograph does not support reliable lithology, bedding orientation or age determination.',
      },
      image: imageKey,
      imageCaption: `${label}, with distant rock exposure visible.`,
      imageDescription: reconnaissance(visible),
      imageAltText: `${label} with exposed rock visible on steep slopes.`,
    },
    structuralRecord(
      `${imageKey}-structure`,
      'folds',
      `${label} — structural reconnaissance`,
      'regional ridge pattern',
      `${visible} The visible ridge pattern is recorded for later geological-map and field comparison; no fold geometry or orientation is asserted.`,
      imageKey,
    ),
  ];
}

function landformPair(
  imageKey: string,
  label: string,
  featureKind: string,
  visible: string,
): CuratedScientificRecord[] {
  return [
    {
      key: `${imageKey}-landform`,
      category: 'karst_erosional_landforms',
      recordType: 'landform_profile',
      title: `${label} — landform profile`,
      summary: `Photo-based observation of a visible ${featureKind}.`,
      description: reconnaissance(visible),
      attributes: {
        feature_kind: featureKind,
        morphology: `${visible} Elevation, dimensions, material and genesis require field or map verification.`,
      },
      image: imageKey,
      imageCaption: `${label}, regional landscape view.`,
      imageDescription: reconnaissance(visible),
      imageAltText: `${label} and its surrounding rocky landscape.`,
    },
    {
      key: `${imageKey}-outcrop`,
      category: 'karst_erosional_landforms',
      recordType: 'outcrop_observation',
      title: `${label} — rock-exposure reconnaissance`,
      summary:
        'Image-based note for visible rock exposure; geological classification remains open.',
      description: reconnaissance(visible),
      attributes: {
        observation_notes:
          'Rock exposure is visible at landscape scale. Lithology, stratigraphy and structural orientation have not been inferred from the photograph.',
      },
      image: imageKey,
      imageCaption: `${label}, with exposed rock visible in the landscape.`,
      imageDescription: reconnaissance(visible),
      imageAltText: `${label} with exposed rocky slopes in the surrounding landscape.`,
    },
  ];
}

function structuralRecord(
  key: string,
  category: string,
  title: string,
  featureKind: string,
  notes: string,
  imageKey: string,
): CuratedScientificRecord {
  return {
    key,
    category,
    recordType: 'mapped_structural_feature',
    title,
    summary: 'Image-based structural reconnaissance awaiting map and field verification.',
    description: reconnaissance(notes),
    attributes: {
      feature_kind: featureKind,
      geometry_notes: notes,
      interpretation:
        'Provisional visual observation only; no measured orientation or genetic interpretation is assigned.',
    },
    image: imageKey,
    imageCaption: `${title.replace(' — structural reconnaissance', '')}, selected for structural review.`,
    imageDescription: reconnaissance(notes),
    imageAltText: `Landscape image used for the ${title.toLowerCase()} record.`,
  };
}

function reconnaissance(subject: string): string {
  return `This catalog entry is based on a traceable, licensed image of ${subject}. It records only features visible in the image and does not assign an unverified age, lithology, measurement, coordinate or genetic interpretation.`;
}

function caveDescription(): string {
  return reconnaissance('the Shanidar Cave entrance and surrounding rock face');
}

function externalReference(subject: string): string {
  return `This is a traceable external comparison image of ${subject}, not a claimed Kurdistan occurrence. It is retained as a teaching reference and must not be used to infer a local age, unit, material or locality.`;
}
const SEED_NAMESPACE = 'geo-kurdistan:curated-scientific-catalog:v1';

export function stableCatalogUuid(key: string): string {
  const bytes = Buffer.from(
    createHash('sha256').update(`${SEED_NAMESPACE}:${key}`).digest('hex').slice(0, 32),
    'hex',
  );
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
