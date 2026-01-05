import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  // ===========================
  // Affiliation Model
  // ===========================
  Affiliation: a
    .model({
      name: a.string().required(),
      type: a.enum(['university', 'art-school', 'other']),
      code: a.string(),
      programs: a.hasMany('Program', 'affiliationId'),
      deletedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.group('admin'),
      allow.authenticated().to(['read']),
    ]),

  // ===========================
  // Program Model
  // ===========================
  Program: a
    .model({
      affiliationId: a.id().required(),
      name: a.string().required(),
      code: a.string(),
      affiliation: a.belongsTo('Affiliation', 'affiliationId'),
      deletedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.group('admin'),
      allow.authenticated().to(['read']),
    ])
    .secondaryIndexes((index) => [
      index('affiliationId').sortKeys(['name']).name('byAffiliation'),
    ]),

  // ===========================
  // User Model
  // ===========================
  User: a
    .model({
      id: a.id().required(),
      userName: a.string().required(),
      displayName: a.string(),
      email: a.email().required(),
      role: a.enum(['student', 'teacher', 'researcher', 'admin']),
      affiliationId: a.string().required(),
      affiliationName: a.string(),
      programId: a.string(),
      programName: a.string(),
      bio: a.string(),
      avatarKey: a.string(),
      cohortYear: a.integer(),
      grade: a.integer(),
      identityId: a.string(),

      // UI設定
      projectOrder: a.string().array(),
      tagOrder: a.string().array(),
      defaultProfileId: a.id(),
      shareProfileId: a.id(),

      // ストレージ管理
      storageQuotaBytes: a.float().default(64424509440),
      storageUsedBytes: a.float().default(0),
      projectCount: a.integer().default(0),

      // リレーション
      projects: a.hasMany('Project', 'ownerId'),
      profiles: a.hasMany('UserProfileVariant', 'userId'),
      bookmarks: a.hasMany('ProjectBookmark', 'userId'),
      bookmarkTags: a.hasMany('BookmarkTag', 'userId'),
      follows: a.hasMany('UserFollow', 'followerId'),
      deletedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.ownerDefinedIn('id').to(['create', 'read', 'update']),
      allow.group('admin'),
    ])
    .secondaryIndexes((index) => [
      index('affiliationId').sortKeys(['userName']).name('byAffiliation'),
      index('role').sortKeys(['userName']).name('byRole'),
    ]),

  // ===========================
  // UserProfileVariant Model
  // ===========================
  UserProfileVariant: a
    .model({
      userId: a.id().required(),
      label: a.string().required(),
      profileType: a.enum(['normal', 'share']),
      displayName: a.string(),
      bio: a.string(),
      avatarKey: a.string(),
      links: a.json(),
      user: a.belongsTo('User', 'userId'),
      deletedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.ownerDefinedIn('userId'),
      allow.group('admin'),
    ])
    .secondaryIndexes((index) => [
      index('userId').sortKeys(['label']).name('byUser'),
    ]),

  // ===========================
  // Project Model
  // ===========================
  Project: a
    .model({
      ownerId: a.id().required(),
      projectName: a.string().required(),
      description: a.string(),
      startedAt: a.datetime(),

      // メディア情報
      thumbnailAssetId: a.string(),
      latestVersionId: a.string(),
      latestActivityAt: a.datetime(),
      totalSizeBytes: a.float().default(0),
      versionCount: a.integer().default(0),
      assetCount: a.integer().default(0),

      // アクセス制御
      accessLevel: a.enum(['private', 'restricted', 'gallery']),
      shareLinkEnabled: a.boolean().default(false),
      viewerUserIds: a.string().array(),
      editorUserIds: a.string().array(),
      commentVisibility: a.enum(['all', 'editors', 'owner']),

      // 公開プロフィール（ギャラリー用）
      publicProfileVariantId: a.id(),
      publicProfileLabel: a.string(),
      publicDisplayName: a.string(),
      publicBio: a.string(),
      publicAvatarKey: a.string(),
      publicLinks: a.json(),

      // 学校情報（作成時スナップショット）
      affiliationId: a.string().required(),
      programId: a.string(),
      programName: a.string(),
      cohortYear: a.integer(),
      grade: a.integer(),

      // タグ（集計用）
      stageTags: a.string().array(),
      gradeTags: a.string().array(),
      styleTags: a.string().array(),
      mediumTags: a.string().array(),
      customTags: a.string().array(),

      // 概要カード用の代表アセット
      overviewAssetIds: a.id().array(),

      // リレーション
      owner: a.belongsTo('User', 'ownerId'),
      versions: a.hasMany('Version', 'projectId'),
      assets: a.hasMany('Asset', 'projectId'),
      comments: a.hasMany('Comment', 'projectId'),
      shareLinks: a.hasMany('ShareLink', 'projectId'),
      accessHistory: a.hasMany('ProjectAccessHistory', 'projectId'),
      deletedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.ownerDefinedIn('ownerId'),
      allow.ownersDefinedIn('editorUserIds').to(['read', 'update']),
      allow.ownersDefinedIn('viewerUserIds').to(['read']),
      allow.group('admin'),
    ])
    .secondaryIndexes((index) => [
      index('ownerId').sortKeys(['latestActivityAt']).name('byOwner'),
      index('affiliationId').sortKeys(['latestActivityAt']).name('byAffiliation'),
      index('accessLevel').sortKeys(['latestActivityAt']).name('byVisibility'),
    ]),

  // ===========================
  // GalleryProject Model
  // ===========================
  GalleryProject: a
    .model({
      projectId: a.id().required(),
      ownerId: a.id().required(),
      projectName: a.string().required(),
      description: a.string(),
      thumbnailAssetId: a.string(),
      startedAt: a.datetime(),
      latestActivityAt: a.datetime(),
      overviewAssetIds: a.id().array(),
      publicProfileVariantId: a.id(),
      publicProfileLabel: a.string(),
      publicDisplayName: a.string(),
      publicBio: a.string(),
      publicAvatarKey: a.string(),
      publicLinks: a.json(),
      affiliationId: a.string(),
      programId: a.string(),
      cohortYear: a.integer(),
      grade: a.integer(),
      stageTags: a.string().array(),
      gradeTags: a.string().array(),
      styleTags: a.string().array(),
      mediumTags: a.string().array(),
      customTags: a.string().array(),
    })
    .authorization((allow) => [
      allow.publicApiKey().to(['read']),
      allow.ownerDefinedIn('ownerId'),
      allow.group('admin'),
    ]),

  // ===========================
  // Version Model
  // ===========================
  Version: a
    .model({
      projectId: a.id().required(),
      versionNumber: a.integer().required(),
      title: a.string(),
      message: a.string(),
      createdBy: a.id().required(),

      assetCount: a.integer().default(0),
      totalSizeBytes: a.float().default(0),

      storageStatus: a.enum(['HOT', 'COLD', 'RESTORING']),
      restoreExpiresAt: a.datetime(),

      // タグ（バージョン付与）
      stageTags: a.string().array(),
      gradeTags: a.string().array(),
      styleTags: a.string().array(),
      mediumTags: a.string().array(),
      customTags: a.string().array(),

      // 権限継承用
      accessLevel: a.enum(['private', 'restricted', 'gallery']),
      viewerUserIds: a.string().array(),
      editorUserIds: a.string().array(),
      affiliationId: a.string().required(),

      // リレーション
      project: a.belongsTo('Project', 'projectId'),
      assets: a.hasMany('Asset', 'versionId'),
      comments: a.hasMany('Comment', 'versionId'),
      deletedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.ownersDefinedIn('editorUserIds'),
      allow.ownersDefinedIn('viewerUserIds').to(['read']),
      allow.group('admin'),
    ])
    .secondaryIndexes((index) => [
      index('projectId').sortKeys(['versionNumber']).name('byProjectAndNumber'),
    ]),

  // ===========================
  // Asset Model
  // ===========================
  Asset: a
    .model({
      projectId: a.id().required(),
      versionId: a.id().required(),

      // ファイル情報
      fileType: a.enum(['image', 'video', 'text', 'audio', 'other']),
      mimeType: a.string().required(),
      fileExtension: a.string().required(),
      fileSizeBytes: a.float().required(),
      width: a.integer(),
      height: a.integer(),
      duration: a.float(),
      checksum: a.string(),

      // ストレージキー
      hotKey: a.string(),
      coldKey: a.string(),
      originalKey: a.string().required(),
      previewKey: a.string(),
      thumbnailKey: a.string(),
      storageStatus: a.enum(['HOT', 'COLD', 'RESTORING']),
      restoreExpiresAt: a.datetime(),

      // UIメタ
      memo: a.string(),
      pinned: a.boolean().default(false),

      // 権限継承用
      accessLevel: a.enum(['private', 'restricted', 'gallery']),
      viewerUserIds: a.string().array(),
      editorUserIds: a.string().array(),
      affiliationId: a.string().required(),

      // リレーション
      project: a.belongsTo('Project', 'projectId'),
      version: a.belongsTo('Version', 'versionId'),
      comments: a.hasMany('Comment', 'assetId'),
      layouts: a.hasMany('AssetLayout', 'assetId'),
      deletedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.ownersDefinedIn('editorUserIds'),
      allow.ownersDefinedIn('viewerUserIds').to(['read']),
      allow.group('admin'),
    ])
    .secondaryIndexes((index) => [
      index('versionId').name('byVersion'),
      index('projectId').name('byProject'),
    ]),

  // ===========================
  // AssetLayout Model
  // ===========================
  AssetLayout: a
    .model({
      assetId: a.id().required(),
      projectId: a.id().required(),
      versionId: a.id().required(),
      userId: a.id().required(),

      layoutX: a.float(),
      layoutY: a.float(),
      layoutScale: a.float(),
      layoutRotation: a.float(),
      layoutZIndex: a.integer(),

      asset: a.belongsTo('Asset', 'assetId'),
    })
    .authorization((allow) => [
      allow.ownerDefinedIn('userId'),
      allow.group('admin'),
    ])
    .secondaryIndexes((index) => [
      index('userId').sortKeys(['projectId']).name('byUserProject'),
      index('assetId').name('byAsset'),
    ]),

  // ===========================
  // Tag Model
  // ===========================
  Tag: a
    .model({
      label: a.string().required(),
      category: a.enum(['stage', 'grade', 'style', 'medium']),
      scope: a.enum(['global', 'personal']),
      affiliationId: a.string(),
      ownerId: a.id(),
      sortOrder: a.integer(),
      deletedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.ownerDefinedIn('ownerId'),
      allow.group('admin'),
      allow.authenticated().to(['read']),
    ])
    .secondaryIndexes((index) => [
      index('scope').sortKeys(['label']).name('byScope'),
      index('ownerId').sortKeys(['label']).name('byOwner'),
      index('affiliationId').sortKeys(['label']).name('byAffiliation'),
    ]),

  // ===========================
  // TagAssignment Model
  // ===========================
  TagAssignment: a
    .model({
      tagId: a.id().required(),
      targetType: a.enum(['project', 'version']),
      targetId: a.id().required(),
      targetKey: a.string().required(),
      projectId: a.id().required(),
      versionId: a.id(),
      affiliationId: a.string(),
    })
    .authorization((allow) => [allow.group('admin')])
    .secondaryIndexes((index) => [
      index('tagId').name('byTag'),
      index('targetKey').name('byTarget'),
      index('affiliationId').sortKeys(['tagId']).name('byAffiliationTag'),
    ]),

  // ===========================
  // Comment Model
  // ===========================
  Comment: a
    .model({
      projectId: a.id().required(),
      versionId: a.id().required(),
      assetId: a.id(),

      authorId: a.id().required(),
      authorName: a.string().required(),
      body: a.string().required(),
      replyToId: a.id(),

      positionX: a.float(),
      positionY: a.float(),

      // 権限継承用
      accessLevel: a.enum(['private', 'restricted', 'gallery']),
      viewerUserIds: a.string().array(),
      editorUserIds: a.string().array(),
      affiliationId: a.string().required(),
      commentVisibility: a.enum(['all', 'editors', 'owner']),
      projectOwnerId: a.id().required(),
      deletedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.ownersDefinedIn('editorUserIds'),
      allow.ownersDefinedIn('viewerUserIds').to(['read']),
      allow.group('admin'),
    ])
    .secondaryIndexes((index) => [
      index('versionId').name('byVersion'),
      index('projectId').name('byProject'),
    ]),

  // ===========================
  // ShareLink Model
  // ===========================
  ShareLink: a
    .model({
      token: a.string().required(),
      projectId: a.id().required(),
      projectOwnerId: a.id().required(),
      editorUserIds: a.string().array(),
      profileVariantId: a.id(),

      shareName: a.string(),
      createdBy: a.id().required(),
      createdByName: a.string().required(),

      status: a.enum(['active', 'revoked']),
      expiresAt: a.datetime(),
      accessCount: a.integer().default(0),
      maxAccessCount: a.integer(),
      allowedEmails: a.string().array(),

      fixedVersionId: a.id(),
      layoutSnapshotKey: a.string(),
      showComments: a.boolean().default(false),
      viewSettings: a.json(),

      lastAccessedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.ownerDefinedIn('projectOwnerId'),
      allow.ownersDefinedIn('editorUserIds'),
      allow.group('admin'),
    ])
    .secondaryIndexes((index) => [
      index('token').name('byToken'),
      index('projectId').name('byProject'),
    ]),

  // ===========================
  // ProjectAccessHistory Model
  // ===========================
  ProjectAccessHistory: a
    .model({
      projectId: a.id().required(),
      projectOwnerId: a.id().required(),
      changedAt: a.datetime().required(),
      changedBy: a.id().required(),
      fromAccessLevel: a.string(),
      toAccessLevel: a.string(),
      viewerUserIds: a.string().array(),
      editorUserIds: a.string().array(),
      shareLinkEnabled: a.boolean(),
      commentVisibility: a.enum(['all', 'editors', 'owner']),
      reason: a.string(),
    })
    .authorization((allow) => [
      allow.ownerDefinedIn('projectOwnerId').to(['read']),
      allow.ownerDefinedIn('changedBy').to(['create']),
      allow.group('admin'),
    ])
    .secondaryIndexes((index) => [
      index('projectId').sortKeys(['changedAt']).name('byProject'),
    ]),

  // ===========================
  // AccessLog Model (監査用)
  // ===========================
  AccessLog: a
    .model({
      userId: a.id(),
      action: a.enum(['view', 'upload', 'download', 'share', 'delete', 'restore']),
      resourceType: a.enum(['project', 'version', 'asset', 'comment', 'share']),
      resourceId: a.string().required(),
      projectId: a.id(),
      ipAddress: a.string(),
      userAgent: a.string(),
      logDate: a.string().required(),
      timestamp: a.datetime().required(),
    })
    .authorization((allow) => [allow.group('admin').to(['read'])])
    .secondaryIndexes((index) => [
      index('userId').sortKeys(['timestamp']).name('byUserAndTime'),
      index('logDate').sortKeys(['timestamp']).name('byLogDate'),
    ]),

  // ===========================
  // ProjectBookmark Model
  // ===========================
  ProjectBookmark: a
    .model({
      userId: a.id().required(),
      projectId: a.id().required(),
      bookmarkTagIds: a.id().array(),
      user: a.belongsTo('User', 'userId'),
      project: a.belongsTo('Project', 'projectId'),
    })
    .authorization((allow) => [
      allow.ownerDefinedIn('userId'),
      allow.group('admin'),
    ])
    .secondaryIndexes((index) => [
      index('userId').name('byUser'),
      index('projectId').name('byProject'),
    ]),

  // ===========================
  // BookmarkTag Model
  // ===========================
  BookmarkTag: a
    .model({
      userId: a.id().required(),
      label: a.string().required(),
      sortOrder: a.integer(),
      deletedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.ownerDefinedIn('userId'),
      allow.group('admin'),
    ])
    .secondaryIndexes((index) => [index('userId').name('byUser')]),

  // ===========================
  // UserFollow Model
  // ===========================
  UserFollow: a
    .model({
      followerId: a.id().required(),
      followeeId: a.id().required(),
    })
    .authorization((allow) => [
      allow.ownerDefinedIn('followerId'),
      allow.group('admin'),
    ])
    .secondaryIndexes((index) => [
      index('followerId').name('byFollower'),
      index('followeeId').name('byFollowee'),
    ]),

  // ===========================
  // ExportJob Model
  // ===========================
  ExportJob: a
    .model({
      requestedBy: a.id().required(),
      scope: a.enum(['project', 'affiliation']),
      affiliationId: a.string(),
      programId: a.string(),
      cohortYear: a.integer(),
      grade: a.integer(),
      yearFrom: a.integer(),
      yearTo: a.integer(),
      projectIds: a.id().array(),
      status: a.enum(['queued', 'processing', 'completed', 'failed']),
      outputKey: a.string(),
      lastError: a.string(),
      completedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.groups(['admin', 'teacher', 'researcher']).to(['create', 'read']),
    ])
    .secondaryIndexes((index) => [index('requestedBy').name('byRequester')]),

  // ===========================
  // UploadSession Model
  // ===========================
  UploadSession: a
    .model({
      projectId: a.id().required(),
      createdBy: a.id().required(),
      status: a.enum(['initiated', 'uploading', 'completed', 'failed', 'expired']),
      fileCount: a.integer(),
      totalSizeBytes: a.float(),
      expiresAt: a.datetime(),
      lastError: a.string(),
    })
    .authorization((allow) => [
      allow.ownerDefinedIn('createdBy'),
      allow.group('admin'),
    ])
    .secondaryIndexes((index) => [index('projectId').name('byProject')]),

  // ===========================
  // ArchiveRestoreJob Model
  // ===========================
  ArchiveRestoreJob: a
    .model({
      requestedBy: a.id().required(),
      projectId: a.id(),
      versionId: a.id(),
      assetIds: a.id().array(),
      status: a.enum(['pending', 'processing', 'active', 'expired', 'failed']),
      requestedAt: a.datetime().required(),
      processingStartedAt: a.datetime(),
      activatedAt: a.datetime(),
      expiresAt: a.datetime(),
      s3BatchJobId: a.string(),
      totalFilesToRestore: a.integer(),
      restoredFiles: a.integer(),
      estimatedCost: a.float(),
      lastError: a.string(),
      retryCount: a.integer().default(0),
    })
    .authorization((allow) => [
      allow.ownerDefinedIn('requestedBy'),
      allow.group('admin'),
    ])
    .secondaryIndexes((index) => [
      index('status').sortKeys(['requestedAt']).name('byStatus'),
      index('requestedBy').sortKeys(['requestedAt']).name('byRequester'),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
