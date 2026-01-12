import { db_A_F } from './db/letters_A_F';
import { db_G_L } from './db/letters_G_L';
import { db_M_R } from './db/letters_M_R';
import { db_S_Z } from './db/letters_S_Z';

export const answerDatabase = {
  ...db_A_F,
  ...db_G_L,
  ...db_M_R,
  ...db_S_Z
};
