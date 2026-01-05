import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'archeAssets',
  access: (allow) => ({
    'users/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
    'public/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
    'tmp/uploads/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
    'exports/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
    'archives/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
  }),
});
