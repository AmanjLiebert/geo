import '../config/load-root-environment';
import { DataSource } from 'typeorm';
import { validateEnvironment } from '../config/environment';
import { createDataSourceOptions } from './database.config';

const environment = validateEnvironment(process.env);

export const appDataSource = new DataSource(createDataSourceOptions(environment));

export default appDataSource;
