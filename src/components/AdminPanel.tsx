import React, { useState, useEffect, useRef } from 'react';
import { Shield, Trophy, Users, Settings, Plus, Trash2, Save, RotateCcw, Eye, EyeOff, ChevronDown, Image, Star } from 'lucide-react';
import { Category, CategoryGroup, Candidate, Banner, Sponsor, VoteConfig } from '../types';
import { db, isFirebaseConfigured, app, auth, storage } from '../firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
// Cloud Functions fallback removed — admin-server Vercel required
import { signInWithEmailAndPassword, signOut, getIdTokenResult } from 'firebase/auth';

// Small helper form to add a new category
function AddCategoryForm({ onAdd, groups }: { onAdd: (c: any) => void; groups: any[] }) {
  const [name, setName] = React.useState('');
  const [group, setGroup] = React.useState(groups?.[0]?.id || '1');
  const handleAdd = () => {
    if (!name) return alert('Nom requis');
    const id = `cat-${Date.now()}`;
    onAdd({ id, name, group, isActive: true });
    setName('');
  };
  useEffect(() => { if (groups && groups[0]) setGroup(groups[0].id); }, [groups]);
  return (
    <div className="col-span-3 flex items-center gap-2">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du trophée" className="flex-1 p-2 border rounded" />
      <select value={group} onChange={(e) => setGroup(e.target.value)} className="p-2 border rounded">
        {(groups || []).map(g => <option key={g.id} value={g.id}>{g.title || g.name}</option>)}
      </select>
      <button onClick={handleAdd} className="px-3 py-2 bg-green-600 text-white rounded">Ajouter</button>
    </div>
  );
}

const SESSION_KEY = 'volants_gabon_admin_session';

interface AdminPanelProps {
  categoryGroups: CategoryGroup[];
  categories: Category[];
  candidates: Candidate[];
  evolutionNote: string;
  banners: Banner[];
  sponsors: Sponsor[];
  voteConfig: VoteConfig;
  onUpdateCategoryGroups: (groups: CategoryGroup[]) => void;
  onUpdateEvolutionNote: (note: string) => void;
  onAddCategory: (category: Category) => void;
  onUpdateCategory: (id: string, updates: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
  onUpdateCandidates: (candidates: Candidate[]) => void;
  onUpdateBanners: (banners: Banner[]) => void;
  onUpdateSponsors: (sponsors: Sponsor[]) => void;
  onUpdateVoteConfig: (config: VoteConfig) => void;
  onResetDefaults: () => void;
  onClose: () => void;
}

type AdminSection = 'overview' | 'groups' | 'categories' | 'candidates' | 'banners' | 'vote' | 'settings';

export function isAdminLoggedIn(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

export function setAdminSession(active: boolean) {
  if (active) sessionStorage.setItem(SESSION_KEY, 'true');
  else sessionStorage.removeItem(SESSION_KEY);
}

export default function AdminPanel(props: AdminPanelProps) {
  const {
    categoryGroups = [],
    categories = [],
    candidates = [],
    evolutionNote = '',
    banners = [],
    sponsors = [],
    voteConfig = { votingEnabled: false, votingOpenedAt: '', votingClosedAt: '' },
    onUpdateCategoryGroups,
    onUpdateEvolutionNote,
    onAddCategory,
    onUpdateCategory,
    onDeleteCategory,
    onUpdateCandidates,
    onUpdateBanners,
    onUpdateSponsors,
    onUpdateVoteConfig,
    onResetDefaults,
    onClose,
  } = props;

  const [loggedIn, setLoggedIn] = useState<boolean>(isAdminLoggedIn());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [section, setSection] = useState<AdminSection>('overview');

  const [draftGroups, setDraftGroups] = useState<CategoryGroup[]>(categoryGroups ?? []);
  const [draftNote, setDraftNote] = useState<string>(evolutionNote ?? '');
  const [draftBanners, setDraftBanners] = useState<Banner[]>(banners ?? []);
  const [draftSponsors, setDraftSponsors] = useState<Sponsor[]>(sponsors ?? []);
  const [editableCandidates, setEditableCandidates] = useState<Candidate[]>(candidates ?? []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<{ kind: 'group' | 'banner' | 'sponsor'; index: number } | null>(null);

  useEffect(() => setDraftGroups(categoryGroups), [categoryGroups]);
  useEffect(() => setDraftNote(evolutionNote), [evolutionNote]);
  useEffect(() => setDraftBanners(banners ?? []), [banners]);
  useEffect(() => setDraftSponsors(sponsors ?? []), [sponsors]);
  useEffect(() => setEditableCandidates(candidates ?? []), [candidates]);

  const navItems: { id: AdminSection; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: "Vue d'ensemble", icon: <Shield className="h-4 w-4" /> },
    { id: 'groups', label: 'Catégories principales', icon: <Trophy className="h-4 w-4" /> },
    { id: 'categories', label: 'Trophées', icon: <ChevronDown className="h-4 w-4" /> },
    { id: 'candidates', label: 'Candidats', icon: <Users className="h-4 w-4" /> },
    { id: 'banners', label: 'Bannières & Sponsors', icon: <Image className="h-4 w-4" /> },
    { id: 'vote', label: 'Contrôle du Vote', icon: <Star className="h-4 w-4" /> },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await getIdTokenResult(cred.user, true);
      if (token.claims && token.claims.admin === true) {
        setAdminSession(true);
        setLoggedIn(true);
      } else {
        await signOut(auth);
        setLoginError("Compte non administrateur. Ajoutez la claim 'admin'.");
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Erreur de connexion');
    }
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch (e) { /* ignore */ }
    setAdminSession(false);
    setLoggedIn(false);
    onClose();
  };

  const toggleVote = async () => {
    const newConfig: VoteConfig = {
      votingEnabled: !voteConfig.votingEnabled,
      votingOpenedAt: !voteConfig.votingEnabled ? new Date().toISOString() : voteConfig.votingOpenedAt,
      votingClosedAt: voteConfig.votingEnabled ? new Date().toISOString() : voteConfig.votingClosedAt,
    };
    // If an external admin server is configured, call it instead of Cloud Functions
    const env = (import.meta as any).env || {};
    const adminServerUrl = env.VITE_ADMIN_SERVER_URL || env.VITE_API_URL;
    const adminServerKey = env.VITE_ADMIN_SERVER_KEY || env.VITE_ADMIN_SERVER_key || env.ADMIN_SERVER_KEY || env.VITE_ADMIN_SERVER_KEY;

    if (adminServerUrl) {
      try {
        const res = await fetch(`${adminServerUrl.replace(/\/$/, '')}/update-vote`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(adminServerKey ? { 'x-api-key': adminServerKey } : {}),
          },
          body: JSON.stringify(newConfig),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || res.statusText || 'Erreur serveur');
        onUpdateVoteConfig(newConfig);
        if (data?.notifications) {
          alert(`${data.notifications.success} notifications envoyées, ${data.notifications.failed} en échec.`);
        } else {
          alert('Statut du vote mis à jour.');
        }
        return;
      } catch (err: any) {
        console.error('admin-server error', err);
        alert('Erreur lors de la mise à jour via admin-server: ' + (err?.message || String(err)));
        return;
      }
    }

    // No fallback: require admin server URL
    alert("Erreur: admin-server non configuré. Définissez VITE_ADMIN_SERVER_URL pour activer les actions d'administration.");
    return;
  };

  if (!loggedIn) {
    return (
      <div className="mx-auto max-w-md p-8">
        <h2 className="text-2xl font-bold mb-4">Administration</h2>
        <form onSubmit={handleLogin} className="space-y-3">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@exemple.tld" className="w-full p-2 border rounded" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mot de passe" type="password" className="w-full p-2 border rounded" />
          {loginError && <div className="text-sm text-red-600">{loginError}</div>}
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Se connecter</button>
            <button type="button" onClick={() => { setEmail(''); setPassword(''); }} className="px-4 py-2 border rounded">Effacer</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex gap-6">
        <nav className="w-64">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.id}>
                <button onClick={() => setSection(item.id)} className={`w-full text-left px-3 py-2 rounded ${section === item.id ? 'bg-gray-200' : ''}`}>
                  <span className="inline-flex items-center gap-2">{item.icon}<span>{item.label}</span></span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <button onClick={handleLogout} className="px-3 py-2 bg-red-500 text-white rounded">Se déconnecter</button>
          </div>
        </nav>

        <main className="flex-1">
          {section === 'overview' && (
            <div>
              <h3 className="text-lg font-bold">Vue d'ensemble</h3>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="p-4 border rounded">Catégories: {(categoryGroups || []).length}</div>
                <div className="p-4 border rounded">Trophées: {(categories || []).length}</div>
                <div className="p-4 border rounded">Candidats: {(candidates || []).length}</div>
              </div>
            </div>
          )}

          {section === 'vote' && (
            <div>
              <h3 className="text-lg font-bold">Contrôle du Vote</h3>
              <p className="mt-2">Statut: {voteConfig.votingEnabled ? 'Ouvert' : 'Fermé'}</p>
              <div className="mt-4">
                <button onClick={toggleVote} className={`px-4 py-2 rounded ${voteConfig.votingEnabled ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
                  {voteConfig.votingEnabled ? 'Désactiver le vote' : 'Activer le vote'}
                </button>
              </div>
              {voteConfig.votingOpenedAt && <p className="text-sm text-gray-600 mt-2">Ouvert le: {new Date(voteConfig.votingOpenedAt).toLocaleString()}</p>}
              {voteConfig.votingClosedAt && <p className="text-sm text-gray-600 mt-1">Fermé le: {new Date(voteConfig.votingClosedAt).toLocaleString()}</p>}
            </div>
          )}
          {/* Groups editor */}
          {section === 'groups' && (
            <div>
              <h3 className="text-lg font-bold">Catégories principales</h3>
              <div className="mt-3 space-y-3">
                {draftGroups.map((g, i) => (
                  <div key={g.id} className="space-y-2 p-3 border rounded">
                    <div className="flex items-center gap-2">
                            <input value={(g as any).title || ''} onChange={(e) => setDraftGroups(prev => {
                        const next = prev.map(x => x.id === g.id ? { ...x, title: e.target.value } : x);
                        try { onUpdateCategoryGroups(next); } catch (e) {}
                        return next;
                      })} className="flex-1 p-2 border rounded" placeholder="Titre du groupe (ex: Catégories Pro)" />
                            <input value={(g as any).imageUrl || ''} onChange={(e) => setDraftGroups(prev => {
                              const next = prev.map(x => x.id === g.id ? { ...x, imageUrl: e.target.value } : x);
                              try { onUpdateCategoryGroups(next); } catch (e) {}
                              return next;
                            })} className="w-56 p-2 border rounded" placeholder="URL image (imageUrl)" />
                            <button type="button" onClick={() => { setUploadTarget({ kind: 'group', index: i }); fileInputRef.current?.click(); }} className="px-2 py-1 border rounded">Téléverser</button>
                      <div className="flex gap-1">
                        <button disabled={i===0} onClick={() => setDraftGroups(prev => { const copy = [...prev]; [copy[i-1], copy[i]] = [copy[i], copy[i-1]]; try { onUpdateCategoryGroups(copy); } catch(e){}; return copy; })} className="px-2 py-1 border rounded">↑</button>
                        <button disabled={i===draftGroups.length-1} onClick={() => setDraftGroups(prev => { const copy = [...prev]; [copy[i+1], copy[i]] = [copy[i], copy[i+1]]; try { onUpdateCategoryGroups(copy); } catch(e){}; return copy; })} className="px-2 py-1 border rounded">↓</button>
                        <button onClick={() => {
                          setDraftGroups(prev => {
                            const next = prev.filter(x => x.id !== g.id);
                            try { onUpdateCategoryGroups(next); } catch (e) { /* ignore */ }
                            alert('Groupe supprimé et enregistré');
                            return next;
                          });
                        }} className="px-2 py-1 border rounded text-red-600">Suppr</button>
                      </div>
                    </div>
                    <div>
                      <textarea value={(g as any).explanation || ''} onChange={(e) => setDraftGroups(prev => {
                        const next = prev.map(x => x.id === g.id ? { ...x, explanation: e.target.value } : x);
                        try { onUpdateCategoryGroups(next); } catch (e) {}
                        return next;
                      })} className="w-full p-2 border rounded" placeholder="Description / explication du groupe" />
                    </div>
                  </div>
                ))}

                <div className="flex gap-2">
                  <button onClick={() => {
                      const id = `group-${Date.now()}`;
                      setDraftGroups(prev => {
                        const next = [...prev, { id, title: 'Nouvelle catégorie principale', explanation: '', imageUrl: '', featuredSubcategoryIds: [] } as any];
                        try { onUpdateCategoryGroups(next); } catch (e) { /* ignore */ }
                        alert('Groupe ajouté et enregistré');
                        return next;
                      });
                    }} className="px-3 py-2 bg-green-600 text-white rounded">Ajouter un groupe</button>
                  <button onClick={() => { onUpdateCategoryGroups(draftGroups); alert('Catégories principales enregistrées'); }} className="px-3 py-2 bg-blue-600 text-white rounded">Enregistrer</button>
                </div>
              </div>
            </div>
          )}

          {/* Categories editor */}
          {section === 'categories' && (
            <div>
              <h3 className="text-lg font-bold">Trophées</h3>
              <div className="mt-3 space-y-3">
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <input value={c.name} onChange={(e) => onUpdateCategory(c.id, { name: e.target.value })} className="flex-1 p-2 border rounded" />
                    <label className="flex items-center gap-2"><input type="checkbox" checked={c.isActive !== false} onChange={(e) => onUpdateCategory(c.id, { isActive: e.target.checked })} /> Actif</label>
                  </div>
                ))}
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <AddCategoryForm onAdd={(newCat) => { onAddCategory(newCat); alert('Trophée ajouté'); }} groups={categoryGroups} />
                </div>
              </div>
            </div>
          )}

          {/* Candidates editor */}
          {section === 'candidates' && (
            <div>
              <h3 className="text-lg font-bold">Candidats</h3>
              <div className="mt-3 overflow-auto">
                <table className="w-full text-left table-auto">
                  <thead>
                    <tr>
                      <th className="p-2">Prénom</th>
                      <th className="p-2">Nom</th>
                      <th className="p-2">Catégorie</th>
                      <th className="p-2">Votes</th>
                      <th className="p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editableCandidates.map((cand, idx) => (
                      <tr key={cand.id} className="border-t">
                        <td className="p-2"><input className="w-full p-1 border rounded" value={cand.prenom} onChange={(e) => setEditableCandidates(prev => prev.map(x => x.id === cand.id ? { ...x, prenom: e.target.value } : x))} /></td>
                        <td className="p-2"><input className="w-full p-1 border rounded" value={cand.nom} onChange={(e) => setEditableCandidates(prev => prev.map(x => x.id === cand.id ? { ...x, nom: e.target.value } : x))} /></td>
                        <td className="p-2">{cand.categoryName || cand.categoryId}</td>
                        <td className="p-2"><input className="w-20 p-1 border rounded" type="number" value={cand.votesCount ?? 0} onChange={(e) => setEditableCandidates(prev => prev.map(x => x.id === cand.id ? { ...x, votesCount: Number(e.target.value) } : x))} /></td>
                        <td className="p-2 flex gap-2">
                          <button onClick={() => { const updated = editableCandidates.map(x => x.id === cand.id ? cand : x); onUpdateCandidates(updated); alert('Candidat mis à jour'); }} className="px-2 py-1 border rounded">Sauvegarder</button>
                          <button onClick={() => { if (confirm('Supprimer ce candidat ?')) { const updated = editableCandidates.filter(x => x.id !== cand.id); setEditableCandidates(updated); onUpdateCandidates(updated); alert('Candidat supprimé'); } }} className="px-2 py-1 border rounded text-red-600">Suppr</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3">
                  <button onClick={() => { onUpdateCandidates(editableCandidates); alert('Liste candidats enregistrée'); }} className="px-3 py-2 bg-blue-600 text-white rounded">Enregistrer tous</button>
                </div>
              </div>
            </div>
          )}

          {/* Banners & Sponsors editor */}
          {section === 'banners' && (
            <div>
              <h3 className="text-lg font-bold">Bannières & Sponsors</h3>
              <div className="mt-3 grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold">Bannières</h4>
                  <div className="space-y-2 mt-2">
                    {draftBanners.map((b, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input value={(b as any).imageUrl || ''} onChange={(e) => setDraftBanners(prev => prev.map((x, idx) => idx===i ? { ...(x as any), imageUrl: e.target.value } : x))} className="flex-1 p-2 border rounded" placeholder="URL image (imageUrl)" />
                        <button type="button" onClick={() => { setUploadTarget({ kind: 'banner', index: i }); fileInputRef.current?.click(); }} className="px-2 py-1 border rounded">Téléverser</button>
                        <input value={(b as any).linkUrl || ''} onChange={(e) => setDraftBanners(prev => prev.map((x, idx) => idx===i ? { ...(x as any), linkUrl: e.target.value } : x))} className="w-48 p-2 border rounded" placeholder="Lien cible (linkUrl)" />
                        <button onClick={() => setDraftBanners(prev => prev.filter((_, idx) => idx!==i))} className="px-2 py-1 border rounded text-red-600">Suppr</button>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => setDraftBanners(prev => [...prev, { id: `banner-${Date.now()}`, imageUrl: '', linkUrl: '', label: '', active: true } as any])} className="px-3 py-2 bg-green-600 text-white rounded">Ajouter bannière</button>
                      <button onClick={() => { onUpdateBanners(draftBanners.map(b => ({ id: (b as any).id || `banner-${Date.now()}`, imageUrl: (b as any).imageUrl || (b as any).image || '', linkUrl: (b as any).linkUrl || (b as any).link || '', label: (b as any).label || '', active: (b as any).active !== false }))); alert('Bannières enregistrées'); }} className="px-3 py-2 bg-blue-600 text-white rounded">Enregistrer</button>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold">Sponsors</h4>
                  <div className="space-y-2 mt-2">
                    {draftSponsors.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input value={(s as any).name || ''} onChange={(e) => setDraftSponsors(prev => prev.map((x, idx) => idx===i ? { ...(x as any), name: e.target.value } : x))} className="flex-1 p-2 border rounded" placeholder="Nom sponsor" />
                        <input value={(s as any).logoUrl || (s as any).logo || ''} onChange={(e) => setDraftSponsors(prev => prev.map((x, idx) => idx===i ? { ...(x as any), logoUrl: e.target.value } : x))} className="w-36 p-2 border rounded" placeholder="URL logo (logoUrl)" />
                        <button type="button" onClick={() => { setUploadTarget({ kind: 'sponsor', index: i }); fileInputRef.current?.click(); }} className="px-2 py-1 border rounded">Téléverser</button>
                        <input value={(s as any).websiteUrl || ''} onChange={(e) => setDraftSponsors(prev => prev.map((x, idx) => idx===i ? { ...(x as any), websiteUrl: e.target.value } : x))} className="w-48 p-2 border rounded" placeholder="Site web (websiteUrl)" />
                        <button onClick={() => setDraftSponsors(prev => prev.filter((_, idx) => idx!==i))} className="px-2 py-1 border rounded text-red-600">Suppr</button>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => setDraftSponsors(prev => [...prev, { id: `sponsor-${Date.now()}`, name: '', logoUrl: '', websiteUrl: '', active: true } as any])} className="px-3 py-2 bg-green-600 text-white rounded">Ajouter sponsor</button>
                      <button onClick={() => { onUpdateSponsors(draftSponsors.map(s => ({ id: (s as any).id || `sponsor-${Date.now()}`, name: (s as any).name || '', logoUrl: (s as any).logoUrl || (s as any).logo || '', websiteUrl: (s as any).websiteUrl || (s as any).website || '', active: (s as any).active !== false }))); alert('Sponsors enregistrés'); }} className="px-3 py-2 bg-blue-600 text-white rounded">Enregistrer</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Hidden file input used for uploads */}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file || !uploadTarget) return;
            try {
              setUploading(true);
              const path = `uploads/${Date.now()}-${file.name}`;
              const sRef = storageRef(storage, path);
              await uploadBytes(sRef, file);
              const url = await getDownloadURL(sRef);
              if (uploadTarget.kind === 'group') {
                setDraftGroups(prev => {
                  const next = prev.map((x, idx) => idx === uploadTarget.index ? { ...x, imageUrl: url } : x);
                  try { onUpdateCategoryGroups(next); } catch (e) {}
                  return next;
                });
              } else if (uploadTarget.kind === 'banner') {
                const next = draftBanners.map((x, idx) => idx === uploadTarget.index ? { ...(x as any), imageUrl: url } : x);
                setDraftBanners(next);
                const normalized = next.map(b => ({ id: (b as any).id || `banner-${Date.now()}`, imageUrl: (b as any).imageUrl || (b as any).image || '', linkUrl: (b as any).linkUrl || (b as any).link || '', label: (b as any).label || '', active: (b as any).active !== false }));
                onUpdateBanners(normalized);
              } else if (uploadTarget.kind === 'sponsor') {
                const next = draftSponsors.map((x, idx) => idx === uploadTarget.index ? { ...(x as any), logoUrl: url } : x);
                setDraftSponsors(next);
                const normalized = next.map(s => ({ id: (s as any).id || `sponsor-${Date.now()}`, name: (s as any).name || '', logoUrl: (s as any).logoUrl || (s as any).logo || '', websiteUrl: (s as any).websiteUrl || (s as any).website || '', active: (s as any).active !== false }));
                onUpdateSponsors(normalized);
              }
            } catch (err) {
              console.error('Upload error', err);
              alert('Erreur de téléversement : ' + (err as any)?.message || String(err));
            } finally {
              setUploading(false);
              setUploadTarget(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }
          }} />

        </main>
      </div>
    </div>
  );
}
