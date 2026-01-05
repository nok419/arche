import { useEffect, useMemo, useState } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import {
  fetchAuthSession,
  fetchUserAttributes,
  getCurrentUser,
} from 'aws-amplify/auth';
import { copy, getUrl, uploadData } from 'aws-amplify/storage';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';
import './App.css';

const client = generateClient<Schema>();

type Project = Schema['Project']['type'];
type Version = Schema['Version']['type'];
type Asset = Schema['Asset']['type'];
type Comment = Schema['Comment']['type'];
type ShareLink = Schema['ShareLink']['type'];
type UserProfile = Schema['User']['type'];
type AccessLevel = 'private' | 'restricted' | 'gallery';
type CommentVisibility = 'all' | 'editors' | 'owner';

type AuthProfile = {
  userId: string;
  identityId?: string;
  userName: string;
  email: string;
  role: 'student' | 'teacher' | 'researcher' | 'admin';
  affiliationId: string;
};

type ShareSnapshot = {
  projectId: string;
  fixedVersionId?: string;
  createdBy: string;
  createdAt: string;
  profileSnapshot?: {
    profileVariantId?: string;
    label?: string;
    displayName?: string;
    bio?: string;
    avatarKey?: string;
    links?: Array<{ label: string; url: string }>;
  };
  viewSettings?: {
    showComments?: boolean;
  };
  assets: Array<{
    assetId: string;
    fileType?: string;
    mimeType?: string;
    width?: number | null;
    height?: number | null;
    duration?: number | null;
    cachedKey: string;
  }>;
};

function App() {
  const shareToken = useMemo(() => {
    const parts = window.location.pathname.split('/').filter(Boolean);
    return parts[0] === 'share' && parts[1] ? parts[1] : null;
  }, []);

  if (shareToken) {
    return <ShareView token={shareToken} />;
  }

  return (
    <Authenticator
      formFields={{
        signUp: {
          nickname: {
            label: 'ユーザーネーム',
            placeholder: 'your-name',
            isRequired: true,
          },
          'custom:affiliation': {
            label: '所属（affiliation）',
            placeholder: 'school-id',
            isRequired: true,
          },
        },
      }}
    >
      {({ signOut }) => <Dashboard signOut={signOut} />}
    </Authenticator>
  );
}

function Dashboard({ signOut }: { signOut?: () => void }) {
  const [authProfile, setAuthProfile] = useState<AuthProfile | null>(null);
  const [userRecord, setUserRecord] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [commentAssetId, setCommentAssetId] = useState('');
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [shareName, setShareName] = useState('');
  const [shareShowComments, setShareShowComments] = useState(true);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('private');
  const [commentVisibility, setCommentVisibility] =
    useState<CommentVisibility>('editors');
  const [viewerUserIdsInput, setViewerUserIdsInput] = useState('');
  const [editorUserIdsInput, setEditorUserIdsInput] = useState('');
  const [shareLinkEnabled, setShareLinkEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  useEffect(() => {
    const boot = async () => {
      const { userId, username } = await getCurrentUser();
      const attrs = await fetchUserAttributes();
      const session = await fetchAuthSession();
      const profile: AuthProfile = {
        userId,
        identityId: session.identityId,
        userName:
          attrs.nickname || attrs.preferred_username || username || 'user',
        email: attrs.email || '',
        role: (attrs['custom:role'] as AuthProfile['role']) || 'student',
        affiliationId: attrs['custom:affiliation'] || 'unknown',
      };
      setAuthProfile(profile);

      const existing = await client.models.User.get({ id: profile.userId });
      if (!existing.data) {
        const { data } = await client.models.User.create({
          id: profile.userId,
          userName: profile.userName,
          email: profile.email,
          role: profile.role,
          affiliationId: profile.affiliationId,
          affiliationName: profile.affiliationId,
          identityId: profile.identityId,
        });
        setUserRecord(data ?? null);
      } else {
        if (profile.identityId && existing.data.identityId !== profile.identityId) {
          await client.models.User.update({
            id: existing.data.id,
            identityId: profile.identityId,
          });
        }
        setUserRecord(existing.data);
      }

      await refreshProjects(profile.userId);
      setIsLoading(false);
    };

    void boot();
  }, []);

  const refreshProjects = async (userId: string) => {
    const { data } = await client.models.Project.list({
      filter: { ownerId: { eq: userId } },
      limit: 100,
    });
    setProjects(data);
  };

  const loadProjectDetail = async (project: Project) => {
    setSelectedProject(project);
    const { data: versionItems } = await client.models.Version.list({
      filter: { projectId: { eq: project.id } },
      limit: 200,
    });
    const sortedVersions = [...versionItems].sort(
      (a, b) => (a.versionNumber ?? 0) - (b.versionNumber ?? 0)
    );
    setVersions(sortedVersions);
    if (sortedVersions.length > 0) {
      setSelectedVersionId(sortedVersions[sortedVersions.length - 1]?.id ?? null);
    } else {
      setSelectedVersionId(null);
      setAssets([]);
    }
  };

  useEffect(() => {
    const loadAssets = async () => {
      if (!selectedProject || !selectedVersionId) {
        return;
      }
      const { data } = await client.models.Asset.list({
        filter: { versionId: { eq: selectedVersionId } },
        limit: 200,
      });
      setAssets(data);
      setAssetUrls({});
    };

    void loadAssets();
  }, [selectedProject, selectedVersionId]);

  useEffect(() => {
    const loadProjectSideData = async () => {
      if (!selectedProject) {
        setComments([]);
        setShareLinks([]);
        return;
      }
      setAccessLevel(
        (selectedProject.accessLevel ?? 'private') as AccessLevel
      );
      setCommentVisibility(
        (selectedProject.commentVisibility ?? 'editors') as CommentVisibility
      );
      setShareLinkEnabled(selectedProject.shareLinkEnabled ?? false);
      setViewerUserIdsInput((selectedProject.viewerUserIds ?? []).join(','));
      setEditorUserIdsInput((selectedProject.editorUserIds ?? []).join(','));

      const { data: commentItems } = await client.models.Comment.list({
        filter: { projectId: { eq: selectedProject.id } },
        limit: 200,
      });
      setComments(commentItems);

      const { data: shareItems } = await client.models.ShareLink.list({
        filter: { projectId: { eq: selectedProject.id } },
        limit: 200,
      });
      setShareLinks(shareItems);
    };

    void loadProjectSideData();
  }, [selectedProject]);

  const handleCreateProject = async () => {
    if (!authProfile || !newProjectName.trim()) {
      return;
    }
    const { data } = await client.models.Project.create({
      ownerId: authProfile.userId,
      projectName: newProjectName.trim(),
      description: newProjectDescription.trim() || undefined,
      accessLevel: 'private',
      shareLinkEnabled: false,
      viewerUserIds: [],
      editorUserIds: [authProfile.userId],
      commentVisibility: 'editors',
      affiliationId: authProfile.affiliationId,
      cohortYear: userRecord?.cohortYear,
      grade: userRecord?.grade,
    });

    if (data) {
      setProjects((prev) => [data, ...prev]);
      setNewProjectName('');
      setNewProjectDescription('');
    }
  };

  const handleUpload = async () => {
    if (!authProfile || !selectedProject || uploadFiles.length === 0) {
      return;
    }
    if (!authProfile.identityId) {
      alert('identityIdが取得できませんでした。再ログインしてください。');
      return;
    }
    setIsUploading(true);

    const editorIds = normalizeEditorIds(selectedProject, authProfile.userId);
    const viewerIds = selectedProject.viewerUserIds ?? [];
    const now = new Date().toISOString();
    const nextVersionNumber =
      versions.reduce((max, v) => Math.max(max, v.versionNumber ?? 0), 0) + 1;

    const { data: newVersion } = await client.models.Version.create({
      projectId: selectedProject.id,
      versionNumber: nextVersionNumber,
      createdBy: authProfile.userId,
      assetCount: uploadFiles.length,
      totalSizeBytes: uploadFiles.reduce((sum, file) => sum + file.size, 0),
      storageStatus: 'HOT',
      accessLevel: selectedProject.accessLevel ?? 'private',
      viewerUserIds: viewerIds,
      editorUserIds: editorIds,
      affiliationId: selectedProject.affiliationId,
    });

    if (!newVersion) {
      setIsUploading(false);
      return;
    }

    for (const file of uploadFiles) {
      const assetId = crypto.randomUUID();
      const extension = file.name.split('.').pop() || '';
      const fileType = resolveFileType(file.type);
      const originalKey = `users/${authProfile.identityId}/projects/${selectedProject.id}/versions/${newVersion.id}/assets/${assetId}/original/${file.name}`;

      await uploadData({
        path: originalKey,
        data: file,
        options: { contentType: file.type },
      }).result;

      const dimensions = await getImageDimensions(file);

      await client.models.Asset.create({
        id: assetId,
        projectId: selectedProject.id,
        versionId: newVersion.id,
        fileType,
        mimeType: file.type || 'application/octet-stream',
        fileExtension: extension,
        fileSizeBytes: file.size,
        width: dimensions?.width,
        height: dimensions?.height,
        originalKey,
        storageStatus: 'HOT',
        memo: '',
        pinned: false,
        accessLevel: selectedProject.accessLevel ?? 'private',
        viewerUserIds: viewerIds,
        editorUserIds: editorIds,
        affiliationId: selectedProject.affiliationId,
      });
    }

    const totalUploadSize = uploadFiles.reduce(
      (sum, file) => sum + file.size,
      0
    );
    const updatedProject = await client.models.Project.update({
      id: selectedProject.id,
      latestVersionId: newVersion.id,
      latestActivityAt: now,
      startedAt: selectedProject.startedAt ?? now,
      versionCount: (selectedProject.versionCount ?? 0) + 1,
      assetCount: (selectedProject.assetCount ?? 0) + uploadFiles.length,
      totalSizeBytes: (selectedProject.totalSizeBytes ?? 0) + totalUploadSize,
    });

    const updated = updatedProject.data;
    if (updated) {
      setSelectedProject(updated);
      setProjects((prev) =>
        prev.map((project) => (project.id === updated.id ? updated : project))
      );
    }

    const { data: versionItems } = await client.models.Version.list({
      filter: { projectId: { eq: selectedProject.id } },
      limit: 200,
    });
    setVersions(
      [...versionItems].sort(
        (a, b) => (a.versionNumber ?? 0) - (b.versionNumber ?? 0)
      )
    );
    setSelectedVersionId(newVersion.id);
    setUploadFiles([]);
    setIsUploading(false);
  };

  const handleUpdateAccess = async () => {
    if (!selectedProject) {
      return;
    }
    const viewerIds = parseIdList(viewerUserIdsInput);
    const editorIds = normalizeEditorIds(
      { ...selectedProject, editorUserIds: parseIdList(editorUserIdsInput) },
      selectedProject.ownerId
    );

    const { data } = await client.models.Project.update({
      id: selectedProject.id,
      accessLevel,
      commentVisibility,
      shareLinkEnabled,
      viewerUserIds: viewerIds,
      editorUserIds: editorIds,
    });

    if (data) {
      setSelectedProject(data);
      setProjects((prev) =>
        prev.map((project) => (project.id === data.id ? data : project))
      );
      if (data.accessLevel === 'gallery') {
        await upsertGalleryProject(data);
      } else {
        await removeGalleryProject(data.id);
      }
    }
  };

  const handlePostComment = async () => {
    if (!authProfile || !selectedProject || !selectedVersionId) {
      return;
    }
    if (!commentBody.trim()) {
      return;
    }

    const editorIds = normalizeEditorIds(selectedProject, authProfile.userId);
    const viewerIds = selectedProject.viewerUserIds ?? [];

    await client.models.Comment.create({
      projectId: selectedProject.id,
      versionId: selectedVersionId,
      assetId: commentAssetId || undefined,
      authorId: authProfile.userId,
      authorName: authProfile.userName,
      body: commentBody.trim(),
      accessLevel: selectedProject.accessLevel ?? 'private',
      viewerUserIds: viewerIds,
      editorUserIds: editorIds,
      affiliationId: selectedProject.affiliationId,
      commentVisibility: selectedProject.commentVisibility ?? 'editors',
      projectOwnerId: selectedProject.ownerId,
    });

    const { data: commentItems } = await client.models.Comment.list({
      filter: { projectId: { eq: selectedProject.id } },
      limit: 200,
    });
    setComments(commentItems);
    setCommentBody('');
    setCommentAssetId('');
  };

  const handleCreateShareLink = async () => {
    if (!authProfile || !selectedProject || !selectedVersionId) {
      return;
    }
    if (assets.length === 0) {
      setShareStatus('アセットがないため共有リンクを作成できません。');
      return;
    }

    const token = crypto.randomUUID();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const existingNames = shareLinks.map((share) => share.shareName).filter(Boolean) as string[];
    const resolvedShareName =
      shareName.trim() || generateShareName(selectedProject.projectName, existingNames);
    const editorIds = normalizeEditorIds(selectedProject, authProfile.userId);

    setShareStatus('共有リンクを作成中...');

    const cachedAssets: ShareSnapshot['assets'] = [];
    for (const asset of assets) {
      const sourceKey = asset.previewKey || asset.originalKey;
      if (!sourceKey) {
        continue;
      }
      const extension = asset.fileExtension || 'bin';
      const cachedKey = `public/shares/${token}/cached/${asset.id}.${extension}`;
      await copy({
        source: { path: sourceKey },
        destination: { path: cachedKey },
      });
      cachedAssets.push({
        assetId: asset.id,
        fileType: asset.fileType || undefined,
        mimeType: asset.mimeType || undefined,
        width: asset.width,
        height: asset.height,
        duration: asset.duration,
        cachedKey,
      });
    }

    const links = Array.isArray(selectedProject.publicLinks)
      ? (selectedProject.publicLinks as Array<{ label: string; url: string }>)
      : [];

    const shareJson: ShareSnapshot = {
      projectId: selectedProject.id,
      fixedVersionId: selectedVersionId,
      createdBy: authProfile.userId,
      createdAt: now,
      profileSnapshot: {
        profileVariantId: selectedProject.publicProfileVariantId ?? undefined,
        label: selectedProject.publicProfileLabel ?? undefined,
        displayName:
          selectedProject.publicDisplayName || authProfile.userName || undefined,
        bio: selectedProject.publicBio ?? undefined,
        avatarKey: selectedProject.publicAvatarKey ?? undefined,
        links,
      },
      viewSettings: { showComments: shareShowComments },
      assets: cachedAssets,
    };

    const layoutJson = {
      versionId: selectedVersionId,
      createdBy: authProfile.userId,
      createdAt: now,
      assets: cachedAssets.map((asset, index) => ({
        assetId: asset.assetId,
        x: 0.5,
        y: 0.5,
        scale: 1,
        rotation: 0,
        zIndex: index,
        pinned: false,
      })),
    };

    await uploadData({
      path: `public/shares/${token}/metadata/share.json`,
      data: JSON.stringify(shareJson, null, 2),
      options: { contentType: 'application/json' },
    }).result;

    await uploadData({
      path: `public/shares/${token}/metadata/layout.json`,
      data: JSON.stringify(layoutJson, null, 2),
      options: { contentType: 'application/json' },
    }).result;

    const { data: shareRecord } = await client.models.ShareLink.create({
      token,
      projectId: selectedProject.id,
      projectOwnerId: selectedProject.ownerId,
      editorUserIds: editorIds,
      shareName: resolvedShareName,
      createdBy: authProfile.userId,
      createdByName: authProfile.userName,
      status: 'active',
      expiresAt,
      fixedVersionId: selectedVersionId,
      layoutSnapshotKey: `public/shares/${token}/metadata/layout.json`,
      showComments: shareShowComments,
      viewSettings: { showComments: shareShowComments },
    });

    if (shareRecord) {
      setShareLinks((prev) => [shareRecord, ...prev]);
      setShareName('');
      setShareStatus(`共有リンクを作成しました: /share/${token}`);
    } else {
      setShareStatus('共有リンクの作成に失敗しました。');
    }
  };

  const latestVersionLabel = useMemo(() => {
    if (!versions.length) return '未作成';
    const latest = versions[versions.length - 1];
    return `v${latest.versionNumber ?? '?'} (${latest.createdAt ?? ''})`;
  }, [versions]);

  const resolveAssetUrl = async (asset: Asset) => {
    if (assetUrls[asset.id]) {
      return;
    }
    try {
      const { url } = await getUrl({ path: asset.previewKey || asset.originalKey });
      setAssetUrls((prev) => ({ ...prev, [asset.id]: url.toString() }));
    } catch (_error) {
      // ignore
    }
  };

  const visibleComments = comments.filter((comment) =>
    canViewComment(comment, authProfile, selectedProject)
  );

  if (isLoading) {
    return <div className="page">Loading...</div>;
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>arche</h1>
          <p className="subtitle">MVP dashboard</p>
        </div>
        <div className="header-actions">
          <span className="chip">{authProfile?.userName}</span>
          <button onClick={signOut} className="ghost">
            Sign out
          </button>
        </div>
      </header>

      <section className="grid">
        <div className="panel">
          <h2>プロジェクト</h2>
          <div className="form">
            <input
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              placeholder="プロジェクト名"
            />
            <input
              value={newProjectDescription}
              onChange={(event) => setNewProjectDescription(event.target.value)}
              placeholder="概要（任意）"
            />
            <button onClick={handleCreateProject}>作成</button>
          </div>
          <ul className="list">
            {projects.map((project) => (
              <li key={project.id}>
                <button
                  className={
                    project.id === selectedProject?.id ? 'selected' : undefined
                  }
                  onClick={() => loadProjectDetail(project)}
                >
                  <div className="title">{project.projectName}</div>
                  <div className="meta">
                    {project.latestActivityAt || '未更新'}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <h2>詳細</h2>
          {selectedProject ? (
            <div className="detail">
              <div className="detail-header">
                <div>
                  <h3>{selectedProject.projectName}</h3>
                  <p className="meta">{selectedProject.description}</p>
                </div>
                <div className="meta">最新: {latestVersionLabel}</div>
              </div>

              <div className="section">
                <h4>アップロード</h4>
                <input
                  type="file"
                  multiple
                  onChange={(event) =>
                    setUploadFiles(Array.from(event.target.files ?? []))
                  }
                />
                <button onClick={handleUpload} disabled={isUploading}>
                  {isUploading ? 'アップロード中...' : 'アップロード'}
                </button>
              </div>

              <div className="section">
                <h4>バージョン</h4>
                <div className="version-list">
                  {versions.map((version) => (
                    <button
                      key={version.id}
                      className={
                        version.id === selectedVersionId ? 'selected' : undefined
                      }
                      onClick={() => setSelectedVersionId(version.id)}
                    >
                      v{version.versionNumber}
                    </button>
                  ))}
                </div>
              </div>

              <div className="section">
                <h4>アセット</h4>
                <div className="asset-grid">
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="asset-card"
                      onMouseEnter={() => resolveAssetUrl(asset)}
                    >
                      {assetUrls[asset.id] && asset.fileType === 'image' ? (
                        <img src={assetUrls[asset.id]} alt={asset.fileExtension} />
                      ) : (
                        <div className="asset-meta">
                          <div>{asset.fileType}</div>
                          <div className="meta">{asset.fileExtension}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="section">
                <h4>アクセス設定</h4>
                <div className="form">
                  <label>
                    公開範囲
                    <select
                      value={accessLevel}
                      onChange={(event) =>
                        setAccessLevel(event.target.value as AccessLevel)
                      }
                    >
                      <option value="private">private</option>
                      <option value="restricted">restricted</option>
                      <option value="gallery">gallery</option>
                    </select>
                  </label>
                  <label>
                    コメント公開範囲
                    <select
                      value={commentVisibility}
                      onChange={(event) =>
                        setCommentVisibility(
                          event.target.value as CommentVisibility
                        )
                      }
                    >
                      <option value="all">all</option>
                      <option value="editors">editors</option>
                      <option value="owner">owner</option>
                    </select>
                  </label>
                  <label>
                    閲覧IDリスト (CSV)
                    <input
                      value={viewerUserIdsInput}
                      onChange={(event) => setViewerUserIdsInput(event.target.value)}
                      placeholder="user-id-1,user-id-2"
                    />
                  </label>
                  <label>
                    編集IDリスト (CSV)
                    <input
                      value={editorUserIdsInput}
                      onChange={(event) => setEditorUserIdsInput(event.target.value)}
                      placeholder="user-id-1,user-id-2"
                    />
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={shareLinkEnabled}
                      onChange={(event) => setShareLinkEnabled(event.target.checked)}
                    />
                    共有リンクを許可する
                  </label>
                  <button onClick={handleUpdateAccess}>保存</button>
                </div>
              </div>

              <div className="section">
                <h4>コメント</h4>
                {visibleComments.length === 0 ? (
                  <p className="meta">コメントは非表示または未投稿です。</p>
                ) : (
                  <ul className="comment-list">
                    {visibleComments.map((comment) => (
                      <li
                        key={comment.id}
                        className={
                          comment.authorId === selectedProject.ownerId
                            ? 'comment-owner'
                            : 'comment-item'
                        }
                      >
                        <div className="comment-meta">
                          {comment.authorName}
                          <span>{comment.createdAt}</span>
                        </div>
                        <p>{comment.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="comment-form">
                  <input
                    value={commentBody}
                    onChange={(event) => setCommentBody(event.target.value)}
                    placeholder="コメントを入力"
                  />
                  <select
                    value={commentAssetId}
                    onChange={(event) => setCommentAssetId(event.target.value)}
                  >
                    <option value="">(プロジェクト全体)</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.fileExtension || asset.id}
                      </option>
                    ))}
                  </select>
                  <button onClick={handlePostComment}>投稿</button>
                </div>
              </div>

              <div className="section">
                <h4>共有リンク</h4>
                <div className="form">
                  <input
                    value={shareName}
                    onChange={(event) => setShareName(event.target.value)}
                    placeholder="共有リンク名（任意）"
                  />
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={shareShowComments}
                      onChange={(event) =>
                        setShareShowComments(event.target.checked)
                      }
                    />
                    コメントを表示する
                  </label>
                  <button onClick={handleCreateShareLink}>
                    共有リンクを発行
                  </button>
                  {shareStatus ? <p className="meta">{shareStatus}</p> : null}
                </div>
                <ul className="share-list">
                  {shareLinks.map((share) => (
                    <li key={share.id}>
                      <span>{share.shareName || share.token}</span>
                      <a href={`/share/${share.token}`} target="_blank" rel="noreferrer">
                        開く
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="empty">プロジェクトを選択してください。</div>
          )}
        </div>
      </section>
    </div>
  );
}

function ShareView({ token }: { token: string }) {
  const [shareData, setShareData] = useState<ShareSnapshot | null>(null);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const load = async () => {
      try {
        const { url } = await getUrl({
          path: `public/shares/${token}/metadata/share.json`,
        });
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('share json not found');
        }
        const data = (await response.json()) as ShareSnapshot;
        setShareData(data);
        setStatus('ready');
      } catch (_error) {
        setStatus('notfound');
      }
    };
    void load();
  }, [token]);

  useEffect(() => {
    const loadAssets = async () => {
      if (!shareData) return;
      const nextUrls: Record<string, string> = {};
      for (const asset of shareData.assets) {
        try {
          const { url } = await getUrl({ path: asset.cachedKey });
          nextUrls[asset.assetId] = url.toString();
        } catch (_error) {
          // ignore
        }
      }
      setAssetUrls(nextUrls);
    };
    void loadAssets();
  }, [shareData]);

  if (status === 'loading') {
    return <div className="share-page">Loading...</div>;
  }

  if (status === 'notfound' || !shareData) {
    return <div className="share-page">共有リンクが見つかりません。</div>;
  }

  return (
    <div className="share-page">
      <header className="share-header">
        <h1>arche share</h1>
        <p>
          {shareData.profileSnapshot?.displayName || 'anonymous'} /{' '}
          {shareData.assets.length} assets
        </p>
      </header>
      <div className="share-grid">
        {shareData.assets.map((asset) => (
          <div key={asset.assetId} className="share-card">
            {assetUrls[asset.assetId] && asset.fileType === 'image' ? (
              <img src={assetUrls[asset.assetId]} alt={asset.assetId} />
            ) : (
              <div className="share-meta">
                <div>{asset.fileType || 'asset'}</div>
                <div className="meta">{asset.assetId}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function resolveFileType(mimeType: string) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('text/')) return 'text';
  return 'other';
}

function parseIdList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeEditorIds(project: Project, fallbackOwnerId: string) {
  const editorIds = project.editorUserIds ?? [];
  if (editorIds.includes(project.ownerId)) {
    return editorIds;
  }
  return [project.ownerId || fallbackOwnerId, ...editorIds.filter(Boolean)];
}

async function upsertGalleryProject(project: Project) {
  const payload = {
    id: project.id,
    projectId: project.id,
    ownerId: project.ownerId,
    projectName: project.projectName,
    description: project.description ?? undefined,
    thumbnailAssetId: project.thumbnailAssetId ?? undefined,
    startedAt: project.startedAt ?? undefined,
    latestActivityAt: project.latestActivityAt ?? undefined,
    overviewAssetIds: project.overviewAssetIds ?? [],
    publicProfileVariantId: project.publicProfileVariantId ?? undefined,
    publicProfileLabel: project.publicProfileLabel ?? undefined,
    publicDisplayName: project.publicDisplayName ?? undefined,
    publicBio: project.publicBio ?? undefined,
    publicAvatarKey: project.publicAvatarKey ?? undefined,
    publicLinks: project.publicLinks ?? undefined,
    affiliationId: project.affiliationId ?? undefined,
    programId: project.programId ?? undefined,
    cohortYear: project.cohortYear ?? undefined,
    grade: project.grade ?? undefined,
    stageTags: project.stageTags ?? [],
    gradeTags: project.gradeTags ?? [],
    styleTags: project.styleTags ?? [],
    mediumTags: project.mediumTags ?? [],
    customTags: project.customTags ?? [],
  };

  const existing = await client.models.GalleryProject.get({ id: project.id });
  if (existing.data) {
    await client.models.GalleryProject.update(payload);
  } else {
    await client.models.GalleryProject.create(payload);
  }
}

async function removeGalleryProject(projectId: string) {
  try {
    await client.models.GalleryProject.delete({ id: projectId });
  } catch (_error) {
    // ignore
  }
}

function generateShareName(projectName: string, existing: string[]) {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}${String(now.getDate()).padStart(2, '0')}`;
  const base = `${projectName}-${stamp}`;
  let name = base;
  let count = 2;
  while (existing.includes(name)) {
    name = `${base}-${count}`;
    count += 1;
  }
  return name;
}

function canViewComment(
  comment: Comment,
  authProfile: AuthProfile | null,
  project: Project | null
) {
  if (!authProfile || !project) return false;
  const visibility = comment.commentVisibility || project.commentVisibility;
  if (visibility === 'owner') {
    return authProfile.userId === project.ownerId;
  }
  if (visibility === 'editors') {
    return (
      project.ownerId === authProfile.userId ||
      (project.editorUserIds ?? []).includes(authProfile.userId)
    );
  }
  return true;
}

async function getImageDimensions(file: File) {
  if (!file.type.startsWith('image/')) {
    return null;
  }
  return new Promise<{ width: number; height: number } | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        resolve({ width: image.width, height: image.height });
      };
      image.onerror = () => resolve(null);
      image.src = reader.result as string;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export default App;
