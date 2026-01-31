export type AppConfig = {
  preferWord: boolean;
  waitForClose: boolean;
  silentOpen: boolean;
};

export const defaultAppConfig: AppConfig = {
  preferWord: true,
  waitForClose: false,
  silentOpen: false
};

