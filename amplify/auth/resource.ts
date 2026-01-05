import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 *
 * Note: role と affiliation は DynamoDB の User モデルで管理
 * - User.role: student | teacher | researcher | admin
 * - User.affiliationId: 所属学校ID
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    nickname: {
      required: true,
      mutable: true,
    },
  },
  groups: ['admin', 'teacher', 'researcher'],
});
