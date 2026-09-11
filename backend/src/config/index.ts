import path from 'node:path';

export const appConfig = {
  get port() {
    return Number(process.env.PORT ?? 3000);
  },
  get host() {
    return process.env.HOST ?? '127.0.0.1';
  },
  get dbPath() {
    return process.env.DB_PATH ?? path.resolve(process.cwd(), 'data', 'inventra.sqlite');
  },
  get decimalPrecision() {
    return Number(process.env.DECIMAL_PRECISION ?? 28);
  },
  get decimalPlaces() {
    return Number(process.env.DECIMAL_PLACES ?? 6);
  },
  get defaultCommandsPath() {
    return path.resolve(process.cwd(), 'src', 'config', 'default-commands.json');
  },
};
