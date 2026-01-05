import { defineBackend } from '@aws-amplify/backend';
// import { auth } from './auth/resource'; // 一時的に無効化
import { data } from './data/resource';
import { storage } from './storage/resource';

defineBackend({
  // auth, // 一時的に無効化 - User Pool 削除のため
  data,
  storage,
});
