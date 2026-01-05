import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    nickname: { required: true, mutable: true },
    'custom:role': { required: false, mutable: true, dataType: 'String' },
    'custom:affiliation': { required: true, mutable: true, dataType: 'String' },
  },
  groups: ['admin', 'teacher', 'researcher'],
});
