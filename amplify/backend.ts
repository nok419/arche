import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';

/**
 * Arche Backend Configuration
 * - auth: Cognito User Pool (email login, groups: admin/teacher/researcher)
 * - data: AppSync GraphQL API with DynamoDB
 * - storage: S3 bucket for assets
 */
defineBackend({
  auth,
  data,
  storage,
});
