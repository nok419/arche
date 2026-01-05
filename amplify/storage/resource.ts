import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'archeAssets',
  access: (allow) => ({
    // ユーザー固有のアセット: 所有者はフルアクセス、認証済みユーザーは読み取り可能（共有機能用）
    'users/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
      allow.authenticated.to(['read']),
    ],
    // 公開コンテンツ: ゲストは読み取り、認証済みユーザーはフルアクセス
    'public/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
    // 一時アップロード: 認証済みユーザーのみ
    'tmp/uploads/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
    // エクスポート: ユーザー固有のパスに制限
    'exports/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
    // アーカイブ: ユーザー固有のパスに制限
    'archives/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
  }),
});
