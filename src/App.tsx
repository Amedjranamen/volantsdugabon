import React, { useState, useEffect } from 'react';
import { 
  Award, Trophy, Users, ShieldCheck, Heart, Send, Sparkles, 
  CheckSquare, Compass, Calendar, MapPin, Phone, Mail, User, 
  Car, Eye, Flame, Search, ChevronRight, CheckCircle2, ChevronDown, 
  Share2, ShieldAlert, Library, FileText, Gift, Palette, Ticket, HelpCircle,
  Menu, X, Upload, Trash2, CreditCard
} from 'lucide-react';
import logoVolants from './assets/images/logo_volants_1780874569896.png';
import stevitchPhoto from './assets/images/stevitch_mboumba_1780874587473.png';
import librevilleTaxi from './assets/images/libreville_taxi_1780991225926.png';
import villageImg from './assets/images/VILLAGE.PNG';
import galaImg from './assets/images/GALA.PNG';
import { INITIAL_CANDIDATES, EXPERIENCE_OPTIONS, VEHICLE_STATUS_OPTIONS } from './data';
import { Category, Candidate, ChauffeurSubmission, VoterSubmission, PartnerSubmission } from './types';
import Confetti from './components/Confetti';
import CategoriesPage from './components/CategoriesPage';
import AdminPanel from './components/AdminPanel';
import { useAppContent } from './hooks/useAppContent';
import { 
  db, 
  isFirebaseConfigured, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  increment, 
  collection, 
  addDoc,
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';

export default function App() {
  // Tab-state aligned precisely with the 5 pages requested
  const [activeTab, setActiveTab ] = useState<'accueil' | 'village' | 'gala' | 'categories' | 'inscriptions' | 'sponsors' | 'admin'>('accueil');
  const [inscriptionPortal, setInscriptionPortal] = useState<'candidat' | 'votant'>('candidat');

  const {
    categoryGroups,
    categories: managedCategories,
    activeCategories,
    evolutionNote,
    updateCategoryGroups,
    updateEvolutionNote,
    addCategory,
    updateCategory,
    deleteCategory,
    resetToDefaults,
  } = useAppContent();

  // ── Sponsors & Bannières — Firestore temps réel ────────────────────────────
  const [sponsors, setSponsors] = useState<import('./types').Sponsor[]>([]);
  const [banners, setBanners] = useState<import('./types').Banner[]>([]);

  // ── Configuration du vote — Firestore temps réel ────────────────────────────
  const [voteConfig, setVoteConfig] = useState<import('./types').VoteConfig>({ votingEnabled: false });

  const updateSponsors = async (newSponsors: import('./types').Sponsor[]) => {
    setSponsors(newSponsors);
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'siteConfig', 'sponsors'), { list: newSponsors });
      } catch (err) { console.error('updateSponsors error:', err); }
    }
  };

  const updateBanners = async (newBanners: import('./types').Banner[]) => {
    setBanners(newBanners);
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'siteConfig', 'banners'), { list: newBanners });
      } catch (err) { console.error('updateBanners error:', err); }
    }
  };

  const updateVoteConfig = async (newConfig: import('./types').VoteConfig) => {
    setVoteConfig(newConfig);
    // Persist locally as fallback so refresh keeps state if Firestore write fails
    try { localStorage.setItem('volants_vote_config', JSON.stringify(newConfig)); } catch (e) { /* ignore */ }

    if (isFirebaseConfigured && db) {
      try {
        // Use merge to avoid accidentally overwriting other fields
        await setDoc(doc(db, 'siteConfig', 'voteConfig'), newConfig, { merge: true });
        console.log('Vote config updated in Firestore:', newConfig);
      } catch (err) {
        console.error('updateVoteConfig error (Firestore):', err);
      }
    }
  };
  
  // Custom states for newly requested pages
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  // Hash routing for admin access (#admin)
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#admin') {
        setActiveTab('admin');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Countdown calculation point to August 23, 2026
  useEffect(() => {
    const targetDate = new Date('2026-08-23T08:00:00+01:00').getTime();
    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Form states under your guidelines
  const [villageForm, setVillageForm] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    vehiculeType: 'Taxi',
    ville: 'Libreville'
  });
  const [villageSuccess, setVillageSuccess] = useState(false);

  const [galaForm, setGalaForm] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    places: 1
  });
  const [galaSuccess, setGalaSuccess] = useState(false);

  const [selectedVotePack, setSelectedVotePack] = useState<number>(1);
  const [isPaymentGatewayActive, setIsPaymentGatewayActive] = useState(true);
  const [voterNotifyForm, setVoterNotifyForm] = useState({
    prenom: '',
    nom: '',
    telephone: '',
    email: ''
  });
  const [voterNotifySuccess, setVoterNotifySuccess] = useState(false);

  // Candidate and Voter registrations State
  const [isRegisteredVoter, setIsRegisteredVoter] = useState<boolean>(false);
  const [voterName, setVoterName] = useState<string>('');
  const [voterPhone, setVoterPhone] = useState<string>('');
  
  // Real-time Candidates Voting data persistent in LocalStorage and/or Firestore
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votedCategories, setVotedCategories] = useState<Record<string, boolean>>({});
  
  // Custom Alert Modal System
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warn' | 'info' } | null>(null);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  // Form submission success tracking
  const [chauffeurSuccess, setChauffeurSuccess] = useState(false);
  const [voterSuccess, setVoterSuccess] = useState(false);
  const [partnerSuccess, setPartnerSuccess] = useState(false);

  // Mobile hamburger menu toggle
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Chauffeur age for categories
  const [chauffeurAge, setChauffeurAge] = useState<string>('');

  // Image upload states for Candidate Chauffeurs
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // E-billing dynamic integration state
  const [activeVoteCandidate, setActiveVoteCandidate] = useState<Candidate | null>(null);
  const [selectedPackSize, setSelectedPackSize] = useState<number>(1);
  const [paymentOperator, setPaymentOperator] = useState<'airtel' | 'moov'>('airtel');
  const [paymentPhone, setPaymentPhone] = useState<string>('');
  const [paymentStep, setPaymentStep] = useState<'select' | 'processing' | 'success'>('select');
  const [votedCandidateIds, setVotedCandidateIds] = useState<Record<string, boolean>>({});
  
  // Track active portal inside Participer tab
  const [activePortal, setActivePortal] = useState<'voter' | 'chauffeur' | 'partner'>('voter');
  

  // Form input states
  const [voterForm, setVoterForm] = useState<VoterSubmission>({
    prenom: '',
    nom: '',
    telephone: '',
    email: '',
    quartier: ''
  });

  const [chauffeurForm, setChauffeurForm] = useState<ChauffeurSubmission>({
    prenom: '',
    nom: '',
    telephone: '',
    immatriculation: '',
    quartier: '',
    experience: 'Moins de 2 ans',
    etatVehicule: 'Neuf (moins de 2 ans)',
    modele: '',
    categorie: '1',
    description: '',
    photo: ''
  });

  const [partnerForm, setPartnerForm] = useState<PartnerSubmission>({
    nomEntreprise: '',
    contactNom: '',
    email: '',
    telephone: '',
    packageSponsor: 'gold',
    interetGagnant: ''
  });

  // Load from local storage or cloud Firestore
  useEffect(() => {
    // Force Red and White theme attribute
    document.documentElement.setAttribute('data-theme', 'rouge');

    // Votes registration local load
    const savedVotes = localStorage.getItem('volants_gabon_votes_v2');
    if (savedVotes) {
      setVotedCategories(JSON.parse(savedVotes));
    }

    const savedCandIds = localStorage.getItem('volants_gabon_voted_cand_ids_v2');
    if (savedCandIds) {
      setVotedCandidateIds(JSON.parse(savedCandIds));
    }

    // Voter profile local load
    const savedVoter = localStorage.getItem('volants_gabon_voter_profile');
    if (savedVoter) {
      const parsed = JSON.parse(savedVoter);
      setIsRegisteredVoter(true);
      setVoterName(`${parsed.prenom} ${parsed.nom}`);
      setVoterPhone(parsed.telephone);
    }

    // Load persisted voteConfig fallback (if present)
    try {
      const rawVoteCfg = localStorage.getItem('volants_vote_config');
      if (rawVoteCfg) setVoteConfig(JSON.parse(rawVoteCfg));
    } catch (e) { /* ignore */ }

    // Load local cache / fallback first for instant delivery and offline-first resilience
    const savedCandidates = localStorage.getItem('volants_gabon_candidates_v2');
    if (savedCandidates) {
      setCandidates(JSON.parse(savedCandidates));
    } else {
      setCandidates(INITIAL_CANDIDATES);
    }

    // Sync candidates real-time
    if (isFirebaseConfigured && db) {
      const q = collection(db, 'candidates');
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
          // Firebase empty - seed INITIAL_CANDIDATES
          INITIAL_CANDIDATES.forEach(async (cand) => {
            try {
              await setDoc(doc(db, 'candidates', cand.id), cand);
            } catch (err) {
              console.error("Bootstrapping candidate error:", err);
            }
          });
          setCandidates(INITIAL_CANDIDATES);
        } else {
          const list: Candidate[] = [];
          snapshot.forEach((d) => {
            list.push(d.data() as Candidate);
          });
          // Sort list smoothly
          list.sort((a, b) => a.id.localeCompare(b.id));
          setCandidates(list);
          localStorage.setItem('volants_gabon_candidates_v2', JSON.stringify(list));
        }
      }, (error) => {
        // Log error and fallback gracefully
        console.warn("Firestore onSnapshot error, continuing offline with local cache:", error);
        // Only throw a hard error if it's a security rule permission-denied issue to help debugging
        if (error instanceof Error && (error.message.includes('permission-denied') || error.message.includes('permissions'))) {
          handleFirestoreError(error, OperationType.LIST, 'candidates');
        }
      });
      return () => unsubscribe();
    }
  }, []);

  // Sponsors & bannières — Firestore temps réel
  useEffect(() => {
    const normalizeSponsorsList = (raw: any[] | undefined) => {
      if (!raw || !Array.isArray(raw)) return [] as import('./types').Sponsor[];
      return raw.map((s: any, idx: number) => ({
        id: s.id || s._id || `sponsor-${idx}`,
        name: s.name || s.label || '',
        logoUrl: s.logoUrl || s.logo || s.imageUrl || '',
        websiteUrl: s.websiteUrl || s.website || s.linkUrl || s.websiteUrl || '',
        active: s.active !== false
      } as import('./types').Sponsor));
    };

    const normalizeBannersList = (raw: any[] | undefined) => {
      if (!raw || !Array.isArray(raw)) return [] as import('./types').Banner[];
      return raw.map((b: any, idx: number) => ({
        id: b.id || b._id || `banner-${idx}`,
        imageUrl: b.imageUrl || b.image || b.url || '',
        linkUrl: b.linkUrl || b.link || b.website || '',
        label: b.label || b.name || '',
        active: b.active !== false
      } as import('./types').Banner));
    };
    if (!isFirebaseConfigured || !db) {
      console.log('Firebase not configured or db not available');
      return;
    }

    const sponsorsRef = doc(db, 'siteConfig', 'sponsors');
    const bannersRef = doc(db, 'siteConfig', 'banners');
    const voteConfigRef = doc(db, 'siteConfig', 'voteConfig');

    // Initialiser les sponsors s'ils n'existent pas
    const initSponsors = async () => {
      try {
        const snap = await getDoc(sponsorsRef);
        if (!snap.exists()) {
          console.log('Initializing sponsors document in Firestore');
          await setDoc(sponsorsRef, { list: [] });
        } else {
          console.log('Sponsors document exists, loading:', snap.data());
          setSponsors(normalizeSponsorsList(snap.data().list as any));
        }
      } catch (err) {
        console.error('Error initializing sponsors:', err);
      }
    };

    // Initialiser les bannières si elles n'existent pas
    const initBanners = async () => {
      try {
        const snap = await getDoc(bannersRef);
        if (!snap.exists()) {
          console.log('Initializing banners document in Firestore');
          await setDoc(bannersRef, { list: [] });
        } else {
          console.log('Banners document exists, loading:', snap.data());
          setBanners(normalizeBannersList(snap.data().list as any));
        }
      } catch (err) {
        console.error('Error initializing banners:', err);
      }
    };

    // Initialiser la configuration du vote si elle n'existe pas
    const initVoteConfig = async () => {
      try {
        const snap = await getDoc(voteConfigRef);
        if (!snap.exists()) {
          console.log('Initializing vote config document in Firestore');
          await setDoc(voteConfigRef, { votingEnabled: false });
        } else {
          console.log('Vote config document exists, loading:', snap.data());
          setVoteConfig(snap.data() as import('./types').VoteConfig);
        }
      } catch (err) {
        console.error('Error initializing vote config:', err);
      }
    };

    // Écouter les changements en temps réel
    const unsubSponsors = onSnapshot(sponsorsRef, (snap) => {
      console.log('Sponsors snapshot received, exists:', snap.exists());
      if (snap.exists()) {
        const data = snap.data();
        console.log('Sponsors data:', data);
        setSponsors(normalizeSponsorsList(data.list as any));
      }
    }, (err) => { console.error('sponsors snapshot error:', err); });

    const unsubBanners = onSnapshot(bannersRef, (snap) => {
      console.log('Banners snapshot received, exists:', snap.exists());
      if (snap.exists()) {
        const data = snap.data();
        console.log('Banners data:', data);
        setBanners(normalizeBannersList(data.list as any));
      }
    }, (err) => { console.error('banners snapshot error:', err); });

    const unsubVoteConfig = onSnapshot(voteConfigRef, (snap) => {
      console.log('Vote config snapshot received, exists:', snap.exists());
      if (snap.exists()) {
        const data = snap.data();
        console.log('Vote config data:', data);
        const cfg = data as import('./types').VoteConfig;
        setVoteConfig(cfg);
        try { localStorage.setItem('volants_vote_config', JSON.stringify(cfg)); } catch (e) { /* ignore */ }
      }
    }, (err) => { console.error('vote config snapshot error:', err); });

    // Initialiser au premier chargement
    initSponsors();
    initBanners();
    initVoteConfig();

    return () => { unsubSponsors(); unsubBanners(); unsubVoteConfig(); };
  }, []);

  const showToast = (message: string, type: 'success' | 'warn' | 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  const openVoterPortal = () => {
    if (!voteConfig?.votingEnabled) {
      showToast('Le vote est actuellement fermé', 'warn');
      return;
    }
    setActiveTab('inscriptions');
    setInscriptionPortal('votant');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToVote = (categoryId: string) => {
    setVoteCategoryFilter(categoryId);
    if (!voteConfig?.votingEnabled) {
      showToast('Le vote est actuellement fermé', 'warn');
      return;
    }
    setActiveTab('inscriptions');
    setInscriptionPortal('votant');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const catName = activeCategories.find((c) => c.id === categoryId)?.name;
    if (catName) showToast(`Catégorie : ${catName}`, 'info');
  };

  const handleAdminUpdateCandidates = async (updated: Candidate[]) => {
    // Update local state and localStorage immediately for optimistic UX
    setCandidates(updated);
    localStorage.setItem('volants_gabon_candidates_v2', JSON.stringify(updated));

    // If Firebase is configured, persist changes: upsert current list and delete removed docs
    if (isFirebaseConfigured && db) {
      try {
        // determine removed candidate ids
        const currentIds = new Set(candidates.map(c => c.id));
        const updatedIds = new Set(updated.map(u => u.id));
        const removed = candidates.filter(c => !updatedIds.has(c.id));

        // Upsert/overwrite updated candidates
        for (const cand of updated) {
          try {
            await setDoc(doc(db, 'candidates', cand.id), cand);
          } catch (err) {
            console.error('Failed to upsert candidate', cand.id, err);
          }
        }

        // Delete removed candidates from Firestore
        for (const rem of removed) {
          try {
            await deleteDoc(doc(db, 'candidates', rem.id));
          } catch (err) {
            console.error('Failed to delete candidate', rem.id, err);
          }
        }
      } catch (err) {
        console.error('handleAdminUpdateCandidates firestore sync error:', err);
      }
    }
  };

  const handleCreateVoterProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voterForm.prenom || !voterForm.nom || !voterForm.telephone || !voterForm.email || !voterForm.quartier) {
      showToast("Veuillez remplir tous les champs du profil votant", 'warn');
      return;
    }

    // Register locally
    localStorage.setItem('volants_gabon_voter_profile', JSON.stringify(voterForm));
    setIsRegisteredVoter(true);
    setVoterName(`${voterForm.prenom} ${voterForm.nom}`);
    setVoterPhone(voterForm.telephone);

    // Save to Firebase Cloud Firestore if configured
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'voters', voterForm.telephone), {
          ...voterForm,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `voters/${voterForm.telephone}`);
      }
    }

    setVoterSuccess(true);
    showToast(`Compte votant créé avec succès ! Bienvenue ${voterForm.prenom}.`, 'success');
  };

  const handleChauffeurCandidacy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chauffeurForm.prenom || !chauffeurForm.nom || !chauffeurForm.telephone || !chauffeurForm.immatriculation || !chauffeurForm.quartier) {
      showToast("Tous les champs marqués d'une étoile (*) sont obligatoires", 'warn');
      return;
    }

    const candidateId = `cand-user-${Date.now()}`;
    // Generate new public candidate shape
    const newCandidate: Candidate = {
      id: candidateId,
      prenom: chauffeurForm.prenom,
      nom: chauffeurForm.nom,
      taxiNo: chauffeurForm.immatriculation,
      experience: chauffeurForm.experience,
      quartier: chauffeurForm.quartier,
      vehicleModel: chauffeurForm.modele || 'Toyota Corolla',
      categoryId: chauffeurForm.categorie,
      categoryName: activeCategories.find(c => c.id === chauffeurForm.categorie)?.name.toUpperCase() || 'CHAMPION',
      votesCount: 0,
      initials: `${chauffeurForm.prenom[0] || 'X'}${chauffeurForm.nom[0] || 'Y'}`.toUpperCase(),
      photo: chauffeurForm.photo || undefined
    };

    // Save locally
    const updatedCandidates = [newCandidate, ...candidates];
    setCandidates(updatedCandidates);
    localStorage.setItem('volants_gabon_candidates_v2', JSON.stringify(updatedCandidates));

    // Save Chauffeur Submission dossier and active public candidate document in Firebase
    if (isFirebaseConfigured && db) {
      try {
        // 1. Submit the private form dossier
        await setDoc(doc(db, 'submissions', candidateId), {
          prenom: chauffeurForm.prenom,
          nom: chauffeurForm.nom,
          telephone: chauffeurForm.telephone,
          immatriculation: chauffeurForm.immatriculation,
          quartier: chauffeurForm.quartier,
          experience: chauffeurForm.experience,
          etatVehicule: chauffeurForm.etatVehicule,
          modele: chauffeurForm.modele || 'Toyota Corolla',
          categorie: chauffeurForm.categorie,
          description: chauffeurForm.description,
          photo: chauffeurForm.photo || null,
          createdAt: serverTimestamp()
        });

        // 2. Put the candidate publicly to the live candidates voting pool
        await setDoc(doc(db, 'candidates', candidateId), {
          ...newCandidate,
          photo: chauffeurForm.photo || null
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `submissions/${candidateId}`);
      }
    }

    setChauffeurSuccess(true);
    setPhotoPreview(null);
    showToast("Votre dossier de candidature a été enregistré avec succès !", 'success');
  };

  const handlePhotoFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast("Le fichier sélectionné doit être une image.", 'warn');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("La taille de l'image ne doit pas dépasser 5 Mo.", 'warn');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setPhotoPreview(base64);
      setChauffeurForm(prev => ({ ...prev, photo: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handlePartnerRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerForm.nomEntreprise || !partnerForm.contactNom || !partnerForm.email || !partnerForm.telephone) {
      showToast("Veuillez remplir les informations de contact indispensables", 'warn');
      return;
    }

    const partnerId = `partner-${Date.now()}`;
    // Save locally
    localStorage.setItem('volants_gabon_last_partner_submission', JSON.stringify(partnerForm));

    // Save Partner Request in Firebase
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'partners', partnerId), {
          ...partnerForm,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `partners/${partnerId}`);
      }
    }

    // Open WhatsApp with prefilled message
    try {
      const waText = encodeURIComponent(
        `Bonjour, je souhaite devenir partenaire des Volants du Gabon.\nEntreprise: ${partnerForm.nomEntreprise}\nContact: ${partnerForm.contactNom}\nEmail: ${partnerForm.email}\nTéléphone: ${partnerForm.telephone}\nPackage: ${partnerForm.packageSponsor}`
      );
      const waUrl = `https://wa.me/24162559055?text=${waText}`;
      window.open(waUrl, '_blank');
    } catch (err) {
      console.warn('Could not open WhatsApp prefill', err);
    }

    // Also call admin-server to send email (if configured)
    try {
      const adminUrl = (import.meta as any).env?.VITE_ADMIN_SERVER_URL as string | undefined;
      const adminKey = (import.meta as any).env?.VITE_ADMIN_SERVER_KEY as string | undefined;
      if (adminUrl) {
        await fetch(`${adminUrl.replace(/\/$/, '')}/send-partner-request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(adminKey ? { 'x-api-key': adminKey } : {}),
          },
          body: JSON.stringify({ partner: partnerForm }),
        });
      }
    } catch (err) {
      console.warn('admin-server partner send failed', err);
    }

    setPartnerSuccess(true);
    showToast(`Demande de partenariat envoyée au comité Niongo Agency ! Package : ${partnerForm.packageSponsor.toUpperCase()}`, 'success');
  };

  const handleVillageRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!villageForm.nom || !villageForm.prenom || !villageForm.telephone) {
      showToast("Veuillez remplir vos Nom, Prénom et Téléphone.", 'warn');
      return;
    }
    const regId = `village-${Date.now()}`;
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'village_registrations', regId), {
          ...villageForm,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `village_registrations/${regId}`);
      }
    }
    setVillageSuccess(true);
    showToast(`Inscription au Village validée ! Merci ${villageForm.prenom}.`, 'success');
  };

  const handleGalaRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galaForm.nom || !galaForm.prenom || !galaForm.telephone || !galaForm.email) {
      showToast("Veuillez remplir toutes les informations d'intérêt.", 'warn');
      return;
    }
    const resId = `gala-${Date.now()}`;
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'gala_reservations', resId), {
          ...galaForm,
          places: Number(galaForm.places),
          createdAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `gala_reservations/${resId}`);
      }
    }
    setGalaSuccess(true);
    showToast(`Intérêt enregistré ! Vous serez contacté en priorité.`, 'success');
  };

  const handleVoterNotifyRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voterNotifyForm.prenom || !voterNotifyForm.nom || !voterNotifyForm.telephone) {
      showToast("Prénom, Nom et Téléphone sont obligatoires.", 'warn');
      return;
    }
    const notifyId = `notify-${Date.now()}`;
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'voter_notifications', notifyId), {
          ...voterNotifyForm,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `voter_notifications/${notifyId}`);
      }
    }
    setVoterNotifySuccess(true);
    showToast("Votre intérêt pour le lancement a été bien pris en compte !", 'success');
  };

  const initiateVotePayment = (candidate: Candidate) => {
    if (!isRegisteredVoter) {
      showToast("Veuillez d'abord configurer votre profil Votant s'il vous plaît !", 'warn');
      openVoterPortal();
      return;
    }
    setActiveVoteCandidate(candidate);
    setSelectedPackSize(1);
    setPaymentOperator('airtel');
    setPaymentPhone(voterPhone || '');
    setPaymentStep('select');
  };

  const executeVote = async (candidate: Candidate, packSize: number = 1) => {
    if (!isRegisteredVoter) {
      showToast("S'identifier d'abord !", 'warn');
      // Highlight voter registration
      openVoterPortal();
      return;
    }

    if (!voteConfig.votingEnabled) {
      showToast("Le vote n'est pas encore ouvert. L'admin lancera le feu vert bientôt.", 'warn');
      return;
    }

    // Optimistically update candidate votes locally and save
    const updated = candidates.map(c => {
      if (c.id === candidate.id) {
        return { ...c, votesCount: (c.votesCount || 0) + packSize };
      }
      return c;
    });

    setCandidates(updated);
    localStorage.setItem('volants_gabon_candidates_v2', JSON.stringify(updated));

    const updatedVotes = { ...votedCategories, [candidate.categoryId]: true };
    setVotedCategories(updatedVotes);
    localStorage.setItem('volants_gabon_votes_v2', JSON.stringify(updatedVotes));

    // Register candidate vote ID history
    const updatedCandIds = { ...votedCandidateIds, [candidate.id]: true };
    setVotedCandidateIds(updatedCandIds);
    localStorage.setItem('volants_gabon_voted_cand_ids_v2', JSON.stringify(updatedCandIds));

    // Sync to Cloud Firestore if connected
    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'candidates', candidate.id), {
          votesCount: increment(packSize)
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `candidates/${candidate.id}`);
      }
    }

    showToast(`Félicitations ! Vos ${packSize} votes pour ${candidate.prenom} ${candidate.nom} ont été comptabilisés en direct !`, 'success');
    setShowConfetti(true);
  };

  const disconnectVoterProf = () => {
    localStorage.removeItem('volants_gabon_voter_profile');
    setIsRegisteredVoter(false);
    setVoterName('');
    setVoterPhone('');
    setVoterSuccess(false);
    showToast("Profil votant déconnecté", 'info');
  };

  // State filtering for votes search
  const [searchTerm, setSearchTerm] = useState('');
  const [voteCategoryFilter, setVoteCategoryFilter] = useState<string>('ALL');

  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = `${c.prenom} ${c.nom} ${c.quartier} ${c.vehicleModel}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = voteCategoryFilter === 'ALL' || c.categoryId === voteCategoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen bg-radial-mesh text-slate-800 flex flex-col font-sans transition-colors duration-500 selection:bg-custom-accent selection:text-white">
      
      {/* Dynamic Celebration Confetti for Votes */}
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />
      
      {/* Dynamic custom Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[100] max-w-sm w-full bg-white border-l-4 border-custom-accent rounded-lg p-4 shadow-xl border border-slate-150 item-fade-in flex items-start space-x-3">
          <div className="mt-0.5">
            {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />}
            {toast.type === 'warn' && <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />}
            {toast.type === 'info' && <Compass className="h-5 w-5 text-sky-500 shrink-0" />}
          </div>
          <div className="flex-grow">
            <p className="font-heading text-xs font-bold uppercase tracking-wider text-slate-900 mb-0.5">Notification</p>
            <p className="font-sans text-xs text-slate-600 leading-relaxed">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Top Header bar */}
      <header className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-xl border-b border-slate-100/80 shadow-xs transition-all duration-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-24 items-center justify-between">
            
{/* Live SVG Event Logo */}
<div 
  onClick={() => setActiveTab('accueil')}
  className="group flex cursor-pointer items-center space-x-3.5"
  id="event_logo_trigger"
>
  <div className="relative">
    {/* Effet de lueur en arrière-plan */}
    
    {/* Conteneur avec largeur définie */}
    <div className="flex items-center px-4 w-[300px]"> 
      <img
        src={logoVolants}
        alt="Les Volants du Gabon Logo"
        className="w-full h-[75px] object-fill transition-transform duration-300 group-hover:scale-105"
        referrerPolicy="no-referrer"
      />
    </div>
    <span className="sr-only">Les Volants du Gabon — Plateforme nationale, 1ère édition</span>
  </div>
</div>

            {/* Main Tabs Selection menu */}
            <nav className="hidden xl:flex items-center space-x-1 bg-slate-50 border border-slate-200/50 p-1 rounded-full shadow-inner shadow-slate-100/80">
              <button
                onClick={() => setActiveTab('accueil')}
                className={`group cursor-pointer flex items-center space-x-1 py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all duration-305 ${
                  activeTab === 'accueil' 
                    ? 'bg-custom-accent text-white shadow-xl shadow-red-500/15' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/85'
                }`}
              >
<span>Excellence</span>
              </button>
              <button
                onClick={() => setActiveTab('village')}
                className={`group cursor-pointer flex items-center space-x-1 py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all duration-305 ${
                  activeTab === 'village' 
                    ? 'bg-custom-accent text-white shadow-xl shadow-red-500/15' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/85'
                }`}
              >
<span>Village</span>
              </button>
              <button
                onClick={() => setActiveTab('gala')}
                className={`group cursor-pointer flex items-center space-x-1 py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all duration-350 ${
                  activeTab === 'gala' 
                    ? 'bg-custom-accent text-white shadow-xl shadow-red-500/15' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/85'
                }`}
              >
<span>Gala</span>
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={`group cursor-pointer flex items-center space-x-1 py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all duration-305 ${
                  activeTab === 'categories' 
                    ? 'bg-custom-accent text-white shadow-xl shadow-red-500/15' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/85'
                }`}
              >
<span>AWARDS</span>
              </button>
              {voteConfig?.votingEnabled && (
                <button
                  onClick={() => openVoterPortal()}
                  className={`group cursor-pointer flex items-center space-x-1 py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all duration-305 ${
                    activeTab === 'inscriptions' 
                      ? 'bg-custom-accent text-white shadow-xl shadow-red-500/15' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/85'
                  }`}
                >
                  <span>Votez</span>
                </button>
              )}
              <button
                onClick={() => { setActiveTab('inscriptions'); setInscriptionPortal('candidat'); }}
                className={`group cursor-pointer flex items-center space-x-1 py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all duration-305 ${
                  activeTab === 'inscriptions' 
                    ? 'bg-custom-accent text-white shadow-xl shadow-red-500/15' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/85'
                }`}
              >
<span>Candidature</span>
              </button>
              <button
                onClick={() => setActiveTab('sponsors')}
                className={`group cursor-pointer flex items-center space-x-1 py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all duration-305 ${
                  activeTab === 'sponsors' 
                    ? 'bg-custom-accent text-white shadow-xl shadow-red-500/15' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/85'
                }`}
              >
<span>Sponsors</span>
              </button>
            </nav>

            {/* Main Tabs Selection menu for medium screens */}
            <nav className="hidden md:flex xl:hidden items-center space-x-1 bg-slate-50 border border-slate-200/50 p-1 rounded-full shadow-inner shadow-slate-100/80">
              <button
                onClick={() => setActiveTab('accueil')}
                className={`group cursor-pointer flex items-center px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-full transition-all ${
                  activeTab === 'accueil' ? 'bg-custom-accent text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
<span>Accueil</span>
              </button>
              <button
                onClick={() => setActiveTab('village')}
                className={`group cursor-pointer flex items-center px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-full transition-all ${
                  activeTab === 'village' ? 'bg-custom-accent text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
<span>Village</span>
              </button>
              <button
                onClick={() => setActiveTab('gala')}
                className={`group cursor-pointer flex items-center px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-full transition-all ${
                  activeTab === 'gala' ? 'bg-custom-accent text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
<span>Gala</span>
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={`group cursor-pointer flex items-center px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-full transition-all ${
                  activeTab === 'categories' ? 'bg-custom-accent text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
<span>AWARDS</span>
              </button>
              {voteConfig?.votingEnabled && (
                <button
                  onClick={() => openVoterPortal()}
                  className={`group cursor-pointer flex items-center px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-full transition-all ${
                    activeTab === 'inscriptions' ? 'bg-custom-accent text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span>Votez</span>
                </button>
              )}
              <button
                onClick={() => { setActiveTab('inscriptions'); setInscriptionPortal('candidat'); }}
                className={`group cursor-pointer flex items-center px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-full transition-all ${
                  activeTab === 'inscriptions' ? 'bg-custom-accent text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
<span>Candidat</span>
              </button>
              <button
                onClick={() => setActiveTab('sponsors')}
                className={`group cursor-pointer flex items-center px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-full transition-all ${
                  activeTab === 'sponsors' ? 'bg-custom-accent text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
<span>Sponsors</span>
              </button>
            </nav>

            {/* Action Call & Mobile Burger Menu */}
            <div className="flex items-center space-x-3.5">
              {voteConfig?.votingEnabled && (
                <button
                  onClick={() => openVoterPortal()}
                  className="hidden lg:inline-flex relative overflow-hidden group cursor-pointer bg-slate-900 hover:bg-slate-950 text-white font-heading text-[10px] font-extrabold uppercase tracking-widest px-5 py-3 rounded-full shadow-lg transition-all duration-300"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-custom-accent to-red-650 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"></span>
                  <span className="relative flex items-center space-x-1.5">
                    <Flame className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
                    <span>Inscriptions</span>
                  </span>
                </button>
              )}

              {/* Hamburger Toggle - Visible below xl */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="xl:hidden flex items-center justify-center cursor-pointer p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-700 transition-all shadow-xs"
                id="burger-toggle-btn"
                aria-label="Menu principal"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5 text-custom-accent animate-[spin_0.2s_ease-out]" />
                ) : (
                  <Menu className="h-5 w-5 text-slate-800" />
                )}
              </button>
            </div>
          </div>
        </div>
        {/* Mobile slide-out dropdown navigation drawer - Rich animations and luxury design */}
        {isMobileMenuOpen && (
          <div className="xl:hidden bg-slate-900 border-t border-slate-800 px-5 py-6 space-y-4 animate-fade-in shadow-2xl relative z-50 rounded-b-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="font-heading text-[9px] font-black tracking-widest text-amber-400 uppercase">
                Menu de Navigation
              </span>
              <span className="inline-flex bg-red-500/15 text-custom-accent text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-widest">
                En direct ✓
              </span>
            </div>

            <div className="space-y-2">
              {[
                { id: 'accueil', label: "L'Excellence", icon: Trophy, desc: 'Accueil et actualités' },
                { id: 'village', label: 'Village Citoyen', icon: Car, desc: 'L\'impact social des chauffeurs' },
                { id: 'gala', label: 'Nuit du Gala', icon: Award, desc: 'Grand dîner de remise' },
                { id: 'categories', label: 'Awards', icon: Compass, desc: '25 awards nationaux' },
                { id: 'inscriptions', label: 'Inscriptions', icon: Flame, desc: 'Soutenez vos champions', premium: true },
                
                { id: 'sponsors', label: 'Partenaires et Sponsors', icon: Users, desc: 'Soutenir l\'initiative' },
              ].map((tab) => {
                const IconComponent = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setIsMobileMenuOpen(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-black tracking-wider uppercase transition-all duration-300 transform active:scale-98 cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-red-650 to-custom-accent text-white border-red-600 shadow-lg shadow-red-650/15'
                        : 'bg-white/5 text-slate-300 border-white/5 hover:border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        <IconComponent className={`h-4 w-4 ${tab.premium && !isSelected ? 'text-amber-400 animate-pulse' : ''}`} />
                      </div>
                      <div className="text-left font-sans">
                        <p className={`text-xs font-black tracking-wide leading-snug ${isSelected ? 'text-white' : 'text-slate-150'}`}>{tab.label}</p>
                        <p className={`text-[8.5px] font-normal lowercase first-letter:uppercase leading-none mt-0.5 ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>{tab.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isSelected ? 'text-white translate-x-1' : 'text-slate-500'}`} />
                  </button>
                );
              })}
            </div>

            {/* Quick action button inside Mobile burger */}
            <div className="border-t border-white/5 pt-4">
              <button
                onClick={() => {
                  openVoterPortal();
                  setIsMobileMenuOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full cursor-pointer bg-amber-400 hover:bg-amber-500 text-slate-950 font-heading text-[9.5px] font-black uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center space-x-1.5"
              >
                <Flame className="h-4 w-4 text-slate-950 animate-bounce" />
                <span>Inscriptions</span>
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow">
        {/* ====================================
            TAB 1: 🏆 L'Excellence en Mouvement (HOME)
            ==================================== */}
        {activeTab === 'accueil' && (
          <div className="item-fade-in relative pb-16">
            
            {/* Hero Section Banner with Authentic Taxi Background */}
            <div className="relative min-h-[600px] flex items-center justify-center text-center overflow-hidden py-24 px-4 sm:px-6 lg:px-8">
              {/* Backing Image Layer with eye-safe dark fade-into-canvas */}
              <div className="absolute inset-0 z-0">
                <img 
                  src={librevilleTaxi} 
                  alt="Authentic Taxi in Libreville" 
                  className="w-full h-full object-cover filter brightness-[0.25] saturate-[0.80]"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
              </div>

              {/* Core Hero Branding Content */}
              <div className="relative z-10 max-w-4xl mx-auto space-y-8">
                
                {/* Organized by label */}
                <div className="inline-flex items-center space-x-2 bg-amber-500/10 border border-amber-500/30 px-4 py-1.5 rounded-full shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="font-montserrat font-bold text-[10px] tracking-widest text-amber-400 uppercase">
                    PROJET PORTÉ PAR NIONGO AGENCY
                  </span>
                </div>

                {/* Primary display headings in essentials & Montserrat */}
                <div className="space-y-4">
                  <h1 className="font-essentials text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white uppercase drop-shadow-md">
                    LES VOLANTS DU GABON 2026
                  </h1>
                  <p className="font-montserrat text-lg sm:text-xl lg:text-2xl font-light text-slate-200 tracking-wide max-w-2xl mx-auto">
                    La première cérémonie nationale de distinction et de professionnalisation des acteurs de taxis, VTC et du transport interurbain au Gabon.
                  </p>
                  <p className="font-essentials text-lg sm:text-xl lg:text-2xl font-bold text-slate-200 tracking-wide max-w-2xl mx-auto">
  Professionnaliser aujourd’hui, célébrer l’excellence demain.
</p>
                </div>

                {/* Visible & Dynamic Countdown clock pointing to August 23, 2026 */}
                <div className="max-w-xl mx-auto py-4 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-2xl">
                  <h3 className="font-montserrat font-bold text-[10px] text-slate-300 uppercase tracking-wider mb-4">
                    Compte à rebours officiel de l'événement
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                      <span className="font-mono text-xl sm:text-3xl font-black text-white block">{timeLeft.days}</span>
                      <span className="text-[9px] text-slate-405 font-montserrat uppercase">Jours</span>
                    </div>
                    <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                      <span className="font-mono text-xl sm:text-3xl font-black text-white block">{timeLeft.hours}</span>
                      <span className="text-[9px] text-slate-405 font-montserrat uppercase">Heures</span>
                    </div>
                    <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                      <span className="font-mono text-xl sm:text-3xl font-black text-white block">{timeLeft.minutes}</span>
                      <span className="text-[9px] text-slate-405 font-montserrat uppercase">Min</span>
                    </div>
                    <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                      <span className="font-mono text-xl sm:text-3xl font-black text-rose-500 block animate-pulse">{timeLeft.seconds}</span>
                      <span className="text-[9px] text-slate-405 font-montserrat uppercase">Sec</span>
                    </div>
                  </div>
                </div>

                {/* Two side-by-side action triggers */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-sm mx-auto">
                  <button
                    onClick={() => { setActiveTab('inscriptions'); setInscriptionPortal('candidat'); }}
                    className="cursor-pointer w-full bg-white hover:bg-slate-50 text-slate-900 font-montserrat font-bold text-xs uppercase tracking-widest py-3.5 px-6 rounded-full shadow-lg transition-transform hover:-translate-y-0.5"
                  >
                    Je candidate
                  </button>
                  {voteConfig?.votingEnabled && (
                    <button
                      onClick={() => openVoterPortal()}
                      className="cursor-pointer w-full bg-custom-accent hover:bg-red-700 text-white font-montserrat font-bold text-xs uppercase tracking-widest py-3.5 px-6 rounded-full shadow-lg transition-transform hover:-translate-y-0.5"
                    >
                      Je vote
                    </button>
                  )}
                </div>

              </div>
            </div>

            {/* SECTION: LES DEUX PILIERS */}
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
              <div className="text-center mb-12">
                <span className="font-montserrat font-bold text-[10.5px] text-custom-accent uppercase tracking-widest">
                  LES DEUX PILIERS FONDATEURS
                </span>
                <h2 className="font-essentials text-2xl sm:text-3xl font-black text-slate-900 mt-2 uppercase">
                  UN ÉVÉNEMENT MAJEUR EN DEUX TEMPS FORTS
                </h2>
              </div>

              {/* Two side-by-side equal blocks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                
                {/* Pillar Block 1: Village des Taxis (off-white tinted red) */}
<div className="bg-red-50/70 border border-red-100 rounded-2xl p-8 sm:p-10 flex flex-col justify-between transition-shadow hover:shadow-lg">
  <div className="space-y-4 w-full">
    <div className="flex items-center space-x-3 text-red-650">
      <span className="text-2xl">🚕</span>
      <span className="font-montserrat font-bold text-xs uppercase tracking-wider">TEMPS CIVIL ET POPULAIRE</span>
    </div>
    <h3 className="font-essentials text-2xl font-black text-slate-905 uppercase leading-tight">
      VILLAGE DES TAXIS
    </h3>
    <p className="font-montserrat font-bold text-xs text-red-600 block">
      Dimanche 23 août 2026
    </p>

    {/* Image cliquable qui remplace le texte et le bouton */}
    <div 
      onClick={() => setActiveTab('village')}
      className="cursor-pointer overflow-hidden rounded-xl block mt-4 group/img"
    >
      <img 
        src={villageImg} 
        alt="Accéder au Village des Taxis" 
        className="w-full h-auto object-cover transition-transform duration-300 group-hover/img:scale-103"
      />
    </div>
  </div>
</div>

                {/* Pillar Block 2: Le Grand Soir of Gala (dark luxury) */}
<div className="bg-slate-900 text-white rounded-2xl p-8 sm:p-10 flex flex-col justify-between transition-shadow hover:shadow-xl relative overflow-hidden">
  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-transparent blur-xl"></div>
  <div className="space-y-4 relative z-10 w-full">
    <div className="flex items-center space-x-3 text-amber-400">
      <span className="text-2xl">🎖️</span>
      <span className="font-montserrat font-bold text-xs uppercase tracking-wider">AWARDS ET DISTINCTIONS</span>
    </div>
    <h3 className="font-essentials text-2xl font-black text-white uppercase leading-tight">
      GALA DES VOLANTS D'OR
    </h3>
    <p className="font-montserrat font-bold text-xs text-amber-400 block">
      Vendredi 4 septembre 2026
    </p>

    {/* Image cliquable qui remplace le texte et le bouton */}
    <div 
      onClick={() => setActiveTab('gala')}
      className="cursor-pointer overflow-hidden rounded-xl block mt-4 group/img"
    >
      <img 
        src={galaImg} 
        alt="Accéder au Gala des Volants d'Or" 
        className="w-full h-auto object-cover transition-transform duration-300 group-hover/img:scale-103"
      />
    </div>
  </div>
</div>
              </div>
            </div>

            {/* Professional Numbers Widget */}
            <div className="bg-slate-50 border-y border-slate-200 py-16">
              <div className="mx-auto max-w-5xl px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div className="bg-white p-6 rounded-xl border border-slate-200">
                  <span className="font-essentials text-[28px] sm:text-4xl font-black text-custom-accent block mb-1">+ de 10 000</span>
                  <span className="font-montserrat text-[10px] text-slate-500 uppercase tracking-wide">Taxis actifs</span>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200">
                  <span className="font-essentials text-[28px] sm:text-4xl font-black text-slate-900 block mb-1">20+</span>
                  <span className="font-montserrat text-[10px] text-slate-500 uppercase tracking-wide">Entreprises VTC</span>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200">
                  <span className="font-essentials text-[28px] sm:text-4xl font-black text-slate-500 block mb-1">+ de 2 000</span>
                  <span className="font-montserrat text-[10px] text-slate-500 uppercase tracking-wide">Personnes Attendues</span>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-100">
                  <span className="font-essentials text-[28px] sm:text-4xl font-black text-custom-accent block mb-1">20+</span>
                  <span className="font-montserrat text-[10px] text-slate-550 uppercase tracking-wide">Awards à Distribuer</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ====================================
            TAB 2: 🍀 PAGE VILLAGE DES TAXIS (VILLAGE)
            ==================================== */}
        {activeTab === 'village' && (
          <div className="item-fade-in mx-auto max-w-5xl px-4 py-12">
            
            {/* Header section with essentials & Montserrat */}
            <div className="text-center mb-10">
              <span className="font-montserrat font-bold text-[10px] text-custom-accent tracking-widest uppercase block mb-1">
                CIVISME ET ACCOMPAGNEMENT • ACTIONS SOLIDAIRES
              </span>
              <h2 className="font-essentials text-2xl sm:text-3xl font-black text-slate-900 mt-1 mb-2 uppercase">
                LE VILLAGE DES CHAUFFEURS
              </h2>
              <p className="font-montserrat text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
                Le 23 août 2026, Libreville célèbre gratuitement et dans une ambiance festive celles et ceux qui prennent la route chaque jour.
              </p>
            </div>
            {/* Village image */}
            <div className="mb-10 w-full rounded-2xl overflow-hidden shadow-lg">
              <img src={villageImg} alt="Village des Chauffeurs" className="w-full block" />
            </div>

            {/* Quick summary bento cards for Date, Lieu, Cible */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
              <div className="bg-red-50/50 border border-red-100 p-5 rounded-xl flex items-center space-x-4 shadow-sm">
                <span className="text-3xl">📅</span>
                <div>
                  <span className="font-montserrat text-[9px] text-slate-400 block uppercase">Date du Village</span>
                  <span className="font-montserrat font-bold text-xs text-slate-900">Dimanche 23 août 2026</span>
                </div>
              </div>
              <div className="bg-red-50/50 border border-red-100 p-5 rounded-xl flex items-center space-x-4 shadow-sm">
                <span className="text-3xl">📍</span>
                <div>
                  <span className="font-montserrat text-[9px] text-slate-400 block uppercase">Lieu de l'événement</span>
                  <span className="font-montserrat font-bold text-xs text-slate-900">Collège Bessieux (Libreville)</span>
                </div>
              </div>
              <div className="bg-red-50/50 border border-red-100 p-5 rounded-xl flex items-center space-x-4 shadow-sm">
                <span className="text-3xl">👥</span>
                <div>
                  <span className="font-montserrat text-[9px] text-slate-400 block uppercase">Public admissible</span>
                  <span className="font-montserrat font-bold text-xs text-slate-900">Chauffeurs & Grand public (Gratuit)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Ateliers and Tombola */}
              <div className="lg:col-span-7 space-y-8">
                  
                  {/* Quick summary sheet */}
                  <div className="bg-white border border-slate-200 p-6 rounded-xl space-y-4 shadow-sm">
                    <h3 className="font-display text-2xl font-black text-slate-900">
                      Le Village des Chauffeurs
                    </h3>
                    <p className="font-sans text-xs sm:text-sm text-slate-600 leading-relaxed font-light">
                      Le Village des Chauffeurs est la journée populaire des Volants du Gabon : le 23 août 2026, Libreville célèbre gratuitement et dans une ambiance festive celles et ceux qui prennent la route chaque jour, chauffeurs de taxi, conducteurs VTC et transporteurs interurbains, à travers une journée entièrement pensée pour les professionnels de la route et leurs familles.
                    </p>

                    {/* Timeline specifications */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans text-xs">
                      <div className="bg-slate-50 p-3 rounded border border-slate-250 flex items-center space-x-3">
                        <Calendar className="h-5 w-5 text-custom-accent shrink-0" />
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Date officielle</span>
                          <span className="text-slate-900 font-bold">Dimanche 23 Août 2026</span>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded border border-slate-250 flex items-center space-x-3">
                        <MapPin className="h-5 w-5 text-custom-accent shrink-0" />
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Lieu de l'événement</span>
                          <span className="text-slate-900 font-bold">Collège Bessieux / Martine Oulabou</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50/50 border border-red-100 p-4 rounded text-xs">
                      <p className="font-heading text-[10px] font-bold text-custom-accent uppercase mb-1">
                        Thème du Village : « Professionnaliser aujourd'hui »
                      </p>
                      <p className="font-sans text-slate-600 font-light">
                        Public attendu : plus de <span className="text-slate-900 font-bold">3 000 participants</span> incluant chauffeurs de taxis, régulateurs, partenaires et usagers.
                      </p>
                    </div>
                  </div>

                  {/* Detailed features of the village from PDF */}
                  <div className="space-y-4">
                    <h4 className="font-display text-slate-900 text-sm uppercase tracking-wider font-extrabold pb-1 border-b border-slate-100">
                      Au programme et activités du Village :
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans text-xs">
                      <div className="bg-white p-4.5 rounded border border-slate-200 shadow-sm">
                        <span className="h-1.5 w-1.5 bg-custom-accent rounded-full inline-block mr-2"></span>
                        <span className="text-slate-905 font-bold">Formations :</span>
                        <p className="text-slate-600 mt-1 font-light">
                          Formations professionnelles dédiées aux chauffeurs : sécurité routière, gestion financière, relation client.
                        </p>
                      </div>

                      <div className="bg-white p-4.5 rounded border border-slate-200 shadow-sm">
                        <span className="h-1.5 w-1.5 bg-custom-accent rounded-full inline-block mr-2"></span>
                        <span className="text-slate-905 font-bold">Consultations médicales gratuites :</span>
                        <p className="text-slate-600 mt-1 font-light">
                          Consultations médicales gratuites pour les chauffeurs inscrits — bilan visuel et cardiovasculaire sur place.
                        </p>
                      </div>

                      <div className="bg-white p-4.5 rounded border border-slate-200 shadow-sm">
                        <span className="h-1.5 w-1.5 bg-custom-accent rounded-full inline-block mr-2"></span>
                        <span className="text-slate-905 font-bold">Espace partenaires et exposants :</span>
                        <p className="text-slate-600 mt-1 font-light">
                          Stands d'exposition pour les partenaires et exposants, présentation de produits et services.
                        </p>
                      </div>

                      <div className="bg-white p-4.5 rounded border border-slate-200 shadow-sm">
                        <span className="h-1.5 w-1.5 bg-custom-accent rounded-full inline-block mr-2"></span>
                        <span className="text-slate-905 font-bold">Animations et spectacles :</span>
                        <p className="text-slate-600 mt-1 font-light">
                          Animations scéniques, spectacles pour toute la famille.
                        </p>
                      </div>

                      <div className="bg-white p-4.5 rounded border border-slate-200 shadow-sm">
                        <span className="h-1.5 w-1.5 bg-custom-accent rounded-full inline-block mr-2"></span>
                        <span className="text-slate-905 font-bold">Jeux et tombola :</span>
                        <p className="text-slate-600 mt-1 font-light">
                          Nombreux lots d'entretiens et cadeaux offerts, animations musicales, stands d'exposition partenaires et espaces de restauration.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Goodies Visualizations (from page 12 of PDF) */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-white border border-slate-250 p-6 rounded-xl shadow-sm">
                    <div className="flex items-center space-x-2 text-custom-accent mb-4">
                      <Gift className="h-5 w-5" />
                      <span className="font-heading text-[10px] font-bold tracking-widest uppercase">
                        GOODIES ET SUPPORTS DES CHAUFFEURS
                      </span>
                    </div>

                    <h4 className="font-display text-sm font-bold text-slate-900 mb-2 leading-tight">
                      Kit Sponsoring Voiture distribué au Village :
                    </h4>
                    <p className="font-sans text-[11.5px] text-slate-600 leading-normal font-light mb-4">
                      En finançant le Village, votre marque s'invite directement dans le quotidien des conducteurs et des milliers de passagers quotidiens grâce aux supports :
                    </p>

                    <div className="space-y-2 text-xs font-sans">
                      <div className="bg-slate-50 p-3 rounded flex items-center justify-between border border-slate-200 hover:border-custom-accent/40 transition-colors">
                        <span className="text-slate-700">Gilets de Sécurité sponsorisés</span>
                        <span className="text-custom-accent font-semibold text-[10px] font-heading font-bold uppercase">Vestes VTC</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded flex items-center justify-between border border-slate-200 hover:border-custom-accent/40 transition-colors">
                        <span className="text-slate-700">Sentir de voiture (Senteur)</span>
                        <span className="text-custom-accent font-semibold text-[10px] font-heading font-bold uppercase">Senteur Personnalisée</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded flex items-center justify-between border border-slate-200 hover:border-custom-accent/40 transition-colors">
                        <span className="text-slate-700">Porte-clés des Volants d'Or</span>
                        <span className="text-custom-accent font-semibold text-[10px] font-heading font-bold uppercase">Goodie</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded flex items-center justify-between border border-slate-200 hover:border-custom-accent/40 transition-colors">
                        <span className="text-slate-700">Gourdes, blocs-notes et stylos</span>
                        <span className="text-custom-accent font-semibold text-[10px] font-heading font-bold uppercase">Kits Sponsors</span>
                      </div>
                    </div>
                  </div>

                  {/* Direct Registration Form Card */}
                  <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-4">
                    <span className="font-montserrat font-bold text-[9px] text-custom-accent uppercase tracking-widest block">
                      INSCRIPTION EN LIGNE
                    </span>
                    <h4 className="font-essentials text-xs font-bold text-slate-900 uppercase">
                      Participer Gratuitemement au Village
                    </h4>

                    {villageSuccess ? (
                      <div className="text-center py-4 space-y-3">
                        <div className="h-10 w-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-lg font-bold">
                          ✓
                        </div>
                        <h5 className="font-essentials font-bold text-[11px] text-slate-900 uppercase">Votre Ticket est Activé</h5>
                        
                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-left font-montserrat text-[10px] space-y-1 relative">
                          <p className="font-bold text-slate-800">{villageForm.prenom} {villageForm.nom}</p>
                          <p><span className="text-slate-400">Tel:</span> {villageForm.telephone}</p>
                          <p><span className="text-slate-400">Lieu:</span> Collège Bessieux</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setVillageSuccess(false)}
                          className="cursor-pointer text-[10px] uppercase font-bold text-custom-accent underline"
                        >
                          Inscrire un autre chauffeur
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleVillageRegister} className="space-y-3 font-montserrat text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Prénom"
                            value={villageForm.prenom}
                            onChange={(e) => setVillageForm({...villageForm, prenom: e.target.value})}
                            className="w-full bg-white border border-slate-250 rounded p-2 text-[11px]"
                          />
                          <input
                            type="text"
                            required
                            placeholder="Nom"
                            value={villageForm.nom}
                            onChange={(e) => setVillageForm({...villageForm, nom: e.target.value})}
                            className="w-full bg-white border border-slate-250 rounded p-2 text-[11px]"
                          />
                        </div>

                        <input
                          type="tel"
                          required
                          placeholder="Téléphone de contact"
                          value={villageForm.telephone}
                          onChange={(e) => setVillageForm({...villageForm, telephone: e.target.value})}
                          className="w-full bg-white border border-slate-250 rounded p-2 text-[11px]"
                        />

                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={villageForm.typeVehicule}
                            onChange={(e) => setVillageForm({...villageForm, typeVehicule: e.target.value})}
                            className="w-full bg-white border border-slate-250 rounded p-2 text-[11px]"
                          >
                            <option value="Taxis">Taxi Citadin</option>
                            <option value="Pick-up">Interurbain</option>
                            <option value="VTC">VTC</option>
                          </select>
                          <select
                            value={villageForm.ville}
                            onChange={(e) => setVillageForm({...villageForm, ville: e.target.value})}
                            className="w-full bg-white border border-slate-250 rounded p-2 text-[11px]"
                          >
                            <option value="Libreville">Libreville</option>
                            <option value="Port-Gentil">Port-Gentil</option>
                            <option value="Franceville">Franceville</option>
                          </select>
                        </div>

                        <button
                          type="submit"
                          className="cursor-pointer w-full bg-custom-accent hover:bg-red-700 text-white font-montserrat font-bold uppercase tracking-widest py-2 px-4 rounded text-[10px] transition-colors shadow"
                        >
                          Réservations ici
                        </button>
                      </form>
                    )}
                  </div>
                </div>

              </div>

          </div>
        )}

        {/* ====================================
            TAB 3: 🥂 LE GRAND SOIR DE GALA (GALA)
            ==================================== */}
        {activeTab === 'gala' && (
          <div className="item-fade-in mx-auto max-w-5xl px-4 py-12">
            
            {/* Gala image */}
            <div className="mb-8 w-full rounded-2xl overflow-hidden shadow-lg">
              <img src={galaImg} alt="Gala des Chauffeurs" className="w-full block" />
            </div>

            {/* Header section with essentials & Montserrat */}
            <div className="text-center mb-10">
              <span className="font-montserrat font-bold text-[10px] text-custom-accent tracking-widest uppercase block mb-1">
                AWARDS ET DISTINCTIONS
              </span>
              <h2 className="font-essentials text-2xl sm:text-3xl font-black text-slate-900 mt-1 mb-2 uppercase">
                GALA DES CHAUFFEURS 2026
              </h2>
              <p className="font-montserrat text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                "Célébrer solennellement l'excellence dans la splendeur et l'unité nationale"
              </p>
            </div>

            {/* Quick summary bento cards for Date, Lieu, Dress Code */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center space-x-4 text-white shadow-sm">
                <span className="text-3xl">🗓️</span>
                <div>
                  <span className="font-montserrat text-[9px] text-amber-500 block uppercase">Soirée du Gala</span>
                  <span className="font-montserrat font-bold text-xs">Vendredi 4 septembre 2026</span>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center space-x-4 text-white shadow-sm">
                <span className="text-3xl">🏢</span>
                <div>
                  <span className="font-montserrat text-[9px] text-amber-500 block uppercase">Lieu du dôme</span>
                  <span className="font-montserrat font-bold text-xs text-white">Karé F (Glass, Libreville)</span>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center space-x-4 text-white shadow-sm">
                <span className="text-3xl">👔</span>
                <div>
                  <span className="font-montserrat text-[9px] text-amber-500 block uppercase">Code Vestimentaire</span>
                  <span className="font-montserrat font-bold text-xs text-white">Prestige • Rouge ou Noir</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start item-fade-in">
                
                {/* Info block */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Quick summary sheet */}
                  <div className="bg-white border border-slate-200 p-6 rounded-xl space-y-4 shadow-sm">
                    <h3 className="font-display text-2xl font-black text-slate-900">
                      Le Gala de Remise des Prix
                    </h3>
                    <p className="font-sans text-xs sm:text-sm text-slate-600 leading-relaxed font-light">
                      Le Gala des Chauffeurs est le grand rendez-vous des Volants du Gabon : le 4 septembre 2026, Libreville s'habille de prestige pour une cérémonie officielle réunissant 400 à 800 invités, autorités, partenaires et professionnels de la route, autour d'un dîner de gala au cours duquel seront décernés les 25 prix aux meilleurs acteurs du transport gabonais.
                    </p>

                    {/* Timeline specifications */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans text-xs">
                      <div className="bg-slate-50 p-3 rounded border border-slate-200 flex items-center space-x-3">
                        <Calendar className="h-5 w-5 text-custom-accent shrink-0" />
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Date du Gala</span>
                          <span className="text-slate-900 font-bold">Vendredi 4 Septembre 2026</span>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded border border-slate-200 flex items-center space-x-3">
                        <MapPin className="h-5 w-5 text-custom-accent shrink-0" />
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Lieu du Gala</span>
                          <span className="text-slate-900 font-bold">Karé F (Glass), Libreville</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50/50 border border-red-100 p-4 rounded text-xs">
                      <p className="font-heading text-[10px] font-bold text-custom-accent uppercase mb-1">
                        Thème du Gala : "L'excellence en mouvement"
                      </p>
                      <p className="font-sans text-slate-650">
                        Capacité d'accueil : de <span className="text-slate-900 font-bold">400 à 800 invités</span> — autorités, partenaires et professionnels de la route.
                      </p>
                    </div>
                  </div>

                  {/* Gala Program outline from page 5 */}
                  <div className="space-y-4">
                    <h4 className="font-display text-slate-900 text-sm uppercase tracking-wider font-extrabold pb-1 border-b border-slate-100">
                      Activités dédiées :
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans text-xs">
                      <div className="bg-white p-4.5 rounded border border-slate-200 shadow-sm">
                        <span className="h-1.5 w-1.5 bg-custom-accent rounded-full inline-block mr-2"></span>
                        <span className="text-slate-905 font-bold">Remise des 25 trophées</span>
                        <p className="text-slate-600 mt-1 font-light">
                          Remise officielle et solennelle des 25 trophées aux meilleurs acteurs du transport gabonais.
                        </p>
                      </div>

                      <div className="bg-white p-4.5 rounded border border-slate-200 shadow-sm">
                        <span className="h-1.5 w-1.5 bg-custom-accent rounded-full inline-block mr-2"></span>
                        <span className="text-slate-905 font-bold">Distribution des enveloppes aux lauréats</span>
                        <p className="text-slate-600 mt-1 font-light">
                          Distribution des enveloppes aux lauréats des différentes catégories.
                        </p>
                      </div>

                      <div className="bg-white p-4.5 rounded border border-slate-200 shadow-sm">
                        <span className="h-1.5 w-1.5 bg-custom-accent rounded-full inline-block mr-2"></span>
                        <span className="text-slate-905 font-bold">Dîner de gala</span>
                        <p className="text-slate-600 mt-1 font-light">
                          Dîner gourmet de gala prestigieux pour les invités et partenaires.
                        </p>
                      </div>

                      <div className="bg-white p-4.5 rounded border border-slate-200 shadow-sm">
                        <span className="h-1.5 w-1.5 bg-custom-accent rounded-full inline-block mr-2"></span>
                        <span className="text-slate-905 font-bold">Animations et artistes invités</span>
                        <p className="text-slate-600 mt-1 font-light">
                          Animations artistiques haut de gamme et concert privé avec artistes invités.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Gala Billetterie detail panels (page 5 of PDF) */}
                <div className="lg:col-span-5 space-y-6">
                  
                  <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
                    <div className="flex items-center space-x-2 text-custom-accent mb-4">
                      <Ticket className="h-5 w-5" />
                      <span className="font-heading text-[10px] font-bold tracking-widest uppercase">
                        BILLETTERIE ET RÉSERVATIONS
                      </span>
                    </div>

                    <h4 className="font-display text-sm font-bold text-slate-900 mb-2 leading-tight">
                      Accès et formules de Table :
                    </h4>
                    <p className="font-sans text-[11.5px] text-slate-600 leading-normal font-light mb-4">
                      Pour assister à la grande soirée d'excellence et côtoyer l'élite économique gabonaise, réservez vos cartons d'invitation :
                    </p>

                    <div className="space-y-4 font-sans text-xs">
                      
                      {/* Item 1 */}
                      <div className="bg-slate-50 p-3.5 rounded border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="text-slate-900 font-bold block">Billet Simple</span>
                          <span className="text-slate-500 text-[10.5px]">Accès au Gala, buffet et cocktail d'accueil.</span>
                        </div>
                        <span className="text-custom-accent font-bold text-xs shrink-0 pl-2">25 000 FCFA</span>
                      </div>

                      {/* Item 2 */}
                      <div className="bg-slate-50 p-3.5 rounded border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="text-slate-900 font-bold block">Table Prestige (6 invités)</span>
                          <span className="text-slate-500 text-[10.5px]">Table réservée, service champagne d'honneur.</span>
                        </div>
                        <span className="text-custom-accent font-bold text-xs shrink-0 pl-2 font-mono">Sur Réservation</span>
                      </div>

                      {/* Item 3 */}
                      <div className="bg-slate-50 p-3.5 rounded border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="text-slate-900 font-bold block">Table VIP d'Honneur (10 invités)</span>
                          <span className="text-slate-500 text-[10.5px]">Positionnement premier rideau, visibilité média de marque.</span>
                        </div>
                        <span className="text-custom-accent font-bold text-xs shrink-0 pl-2 font-mono">Sur Réservation</span>
                      </div>

                    </div>
                  </div>

                  {/* Callback form notice */}
                  <div className="bg-red-50/50 border border-red-150 p-5 rounded-xl text-center">
                    <p className="font-heading text-[10px] font-bold text-custom-accent uppercase mb-2">RÉSERVEZ PAR WHATSAPP</p>
                    <p className="font-sans text-xs text-slate-600 mb-4 font-light">Le comité restreint est disponible en direct pour l'attribution des cartons de table.</p>
                    <a
                      href="https://wa.me/24162559055"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block cursor-pointer bg-custom-accent hover:bg-custom-accent/80 text-white font-heading text-[10px] uppercase font-bold tracking-widest px-4 py-2.5 rounded shadow transition-all duration-300"
                    >
                      Réservations ici — WhatsApp +241 62 55 90 55
                    </a>
                  </div>

                </div>

              </div>

          </div>
        )}

        {/* ====================================
            TAB 3: ESPACE VOTE (INTERACTIVE)
            ==================================== */}
        {activeTab === 'inscriptions' && (
          <div className="item-fade-in mx-auto max-w-5xl px-4 py-12 relative animate-fade-in-up">
            
            <div className="text-center mb-10">
              <span className="font-heading text-[10px] text-custom-accent font-bold tracking-widest uppercase block mb-1">
                PLATEFORME NATIONALE • ESPACE SCRUTIN
              </span>
              <h2 className="font-essentials text-3xl sm:text-4xl text-slate-900 leading-none">
                VOTEZ POUR VOS CHAMPIONS
              </h2>
              <p className="font-montserrat text-xs sm:text-sm text-slate-650 mt-2 font-medium tracking-wide">
                "Votre voix décide. Chaque vote compte."
              </p>
            </div>

            {/* Inactive System Notification Banner with subscription form */}
            {!voteConfig?.votingEnabled && (
              <div className="mb-8 bg-gradient-to-br from-amber-50 to-red-50 border border-amber-200 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
                <div className="space-y-1.5 max-w-xl text-center lg:text-left">
                  <div className="inline-flex items-center space-x-2 bg-amber-500/10 text-amber-800 px-3 py-1 rounded-full text-[9px] font-bold tracking-wider uppercase font-montserrat animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-600"></span>
                    <span>Ouverture Prochaine</span>
                  </div>
                  <h3 className="font-montserrat text-sm sm:text-base font-black text-slate-900 leading-snug">
                    Ouverture des votes — Date à venir. Inscrivez-vous pour être notifié en priorité.
                  </h3>
                  <p className="font-sans text-[11px] text-slate-600 leading-relaxed font-light">
                    Ne manquez pas l'instant décisif ! Enregistrez votre contact ci-contre pour recevoir automatiquement un SMS, WhatsApp ou e-mail de rappel dès le lancement du scrutin live.
                  </p>
                </div>

                {!voterNotifySuccess ? (
                  <form onSubmit={handleVoterNotifyRegister} className="w-full lg:w-auto shrink-0 bg-white p-4.5 rounded-xl border border-slate-150/80 shadow-xs space-y-3.5 max-w-xs">
                    <div className="space-y-1">
                      <label className="block text-[8px] font-bold tracking-widest text-slate-500 uppercase font-heading">Prénom :</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Jean"
                        value={voterNotifyForm.prenom}
                        onChange={(e) => setVoterNotifyForm({ ...voterNotifyForm, prenom: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-205 focus:border-custom-accent rounded-lg px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[8px] font-bold tracking-widest text-slate-500 uppercase font-heading">Nom :</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Pascal"
                        value={voterNotifyForm.nom}
                        onChange={(e) => setVoterNotifyForm({ ...voterNotifyForm, nom: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-205 focus:border-custom-accent rounded-lg px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[8px] font-bold tracking-widest text-slate-500 uppercase font-heading">Mobile (WhatsApp) :</label>
                      <input
                        type="tel"
                        required
                        placeholder="Ex: +241 62 55 90 55"
                        value={voterNotifyForm.telephone}
                        onChange={(e) => setVoterNotifyForm({ ...voterNotifyForm, telephone: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-205 focus:border-custom-accent rounded-lg px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[8px] font-bold tracking-widest text-slate-500 uppercase font-heading">Email :</label>
                      <input
                        type="email"
                        required
                        placeholder="Ex: jean@exemple.com"
                        value={voterNotifyForm.email}
                        onChange={(e) => setVoterNotifyForm({ ...voterNotifyForm, email: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-205 focus:border-custom-accent rounded-lg px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full cursor-pointer bg-slate-900 hover:bg-slate-950 text-white font-heading text-[9px] font-black uppercase tracking-widest py-2.5 rounded-lg transition-all flex items-center justify-center space-x-1.5"
                    >
                      <span>M'inscrire au lancement Jour J</span>
                    </button>
                  </form>
                ) : (
                  <div className="w-full lg:w-auto shrink-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-5 rounded-xl border border-emerald-600 text-center max-w-xs animate-fade-in shadow-md">
                    <CheckCircle2 className="h-7 w-7 mx-auto mb-1.5 text-white animate-bounce" />
                    <p className="font-display text-[10px] font-black uppercase tracking-wider mb-1">Inscription Enregistrée !</p>
                    <p className="font-sans text-[10px] text-emerald-50 font-light leading-snug">
                      Merci ! Votre demande a été validée. Nous vous enverrons un message WhatsApp/SMS le jour J.
                    </p>
                  </div>
                )}
              </div>
              </div>
            )}

            {/* Explication du système de vote Encart (Montserrat) & Packs */}
            <div className="mb-8 bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-6 sm:p-8">
                <h3 className="font-montserrat text-[10.5px] font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[8.5px]">GUIDE</span>
                  Explication du système de vote
                </h3>
                
                <p className="font-montserrat text-xs sm:text-sm text-slate-600 leading-relaxed font-normal mb-6">
                  Le vote est ouvert à tous. Chaque vote coûte 100 FCFA, payable via Airtel Money ou Moov Money. Vous pouvez voter plusieurs fois pour le même candidat ou répartir vos votes entre plusieurs candidats. Les résultats sont affichés en temps réel.
                </p>

                <div className="h-px bg-slate-100 w-full mb-6"></div>

                <div>
                  <h4 className="font-montserrat text-[10px] font-black text-slate-700 uppercase tracking-widest mb-4">
                    Packs de votes disponibles (Cliquez sur un pack pour procéder) :
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { size: 1, label: "Simple", desc: "1 vote — 100 FCFA" },
                      { size: 5, label: "Populaire", desc: "5 votes — 500 FCFA" },
                      { size: 10, label: "Champion", desc: "10 votes — 1 000 FCFA" }
                    ].map((pack) => (
                      <button
                        key={pack.size}
                        type="button"
                        onClick={() => {
                          if (!isRegisteredVoter) {
                            showToast("Veuillez d'abord configurer votre profil Votant s'il vous plaît !", 'warn');
                            openVoterPortal();
                            return;
                          }
                          // Pre-select first candidate if none active
                          if (candidates.length > 0) {
                            setActiveVoteCandidate(candidates[0]);
                          }
                          setSelectedPackSize(pack.size);
                          setPaymentOperator('airtel');
                          setPaymentPhone(voterPhone || '');
                          setPaymentStep('select');
                        }}
                        className="cursor-pointer group flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-200 hover:border-custom-accent/70 bg-slate-50/50 hover:bg-white transition-all duration-300 shadow-2xs hover:shadow-md"
                      >
                        <span className="font-montserrat text-xs font-black text-slate-500 group-hover:text-custom-accent transition-colors uppercase tracking-widest">
                          {pack.label}
                        </span>
                        <span className="font-montserrat text-sm sm:text-base font-black text-slate-900 mt-1">
                          {pack.desc}
                        </span>
                        <div className="mt-3 flex items-center text-[9px] font-bold text-custom-accent font-heading opacity-85 group-hover:opacity-100 uppercase tracking-wider">
                          <span>Sélectionner ce pack</span>
                          <ChevronRight className="h-3 w-3 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Voter Registration status banner widget */}
            {!isRegisteredVoter ? (
              <div className="mb-8 p-5 bg-amber-50 border border-amber-200 rounded-xl flex flex-col md:flex-row gap-5 items-center justify-between text-center md:text-left shadow-sm">
                <div className="flex items-center space-x-3.5">
                  <div className="bg-amber-500/10 p-2 text-amber-600 rounded shrink-0">
                    <ShieldAlert className="h-5 w-5 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-bold text-amber-900">Statut: Vote non configuré</h4>
                    <p className="font-sans text-xs text-amber-700 leading-relaxed font-light">
                      Afin d'éviter les cumuls de vote, vous devez d'abord créer votre profil votant (S'enregistrer comme Citoyen Votant). Gratuit et rapide !
                    </p>
                  </div>
                </div>
                {voteConfig?.votingEnabled && (
                  <button
                    onClick={() => openVoterPortal()}
                    className="cursor-pointer shrink-0 bg-amber-500 hover:bg-amber-600 text-white font-heading font-extrabold uppercase tracking-widest text-[10px] px-4.5 py-2.5 rounded-lg transition-colors"
                  >
                    S'enregistrer comme Votant
                  </button>
                )}
              </div>
            ) : (
              <div className="mb-8 p-5 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="bg-emerald-500/10 p-2 text-emerald-600 rounded shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-bold text-emerald-950">Votant Certifié : {voterName}</h4>
                    <p className="font-sans text-xs text-emerald-700 font-light">Dispositif sécurisé actif sur le numéro : {voterPhone}</p>
                  </div>
                </div>
                <button
                  onClick={disconnectVoterProf}
                  className="cursor-pointer text-slate-500 hover:text-custom-accent font-sans text-[10px] tracking-wide uppercase underline"
                >
                  Déconnecter ma signature
                </button>
              </div>
            )}

            {/* Filter and Search Bar controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8 pb-5 border-b border-slate-200">
              
              {/* Category selector slides tab indicators */}
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {[
                  { id: 'ALL', label: 'TOUT' },
                  ...activeCategories
                    .filter((c) => c.group === '1' || c.group === '2')
                    .slice(0, 8)
                    .map((c) => ({ id: c.id, label: c.name.length > 22 ? c.name.slice(0, 20) + '…' : c.name.toUpperCase() })),
                ].map((tc) => (
                  <button
                    key={tc.id}
                    onClick={() => {
                      setVoteCategoryFilter(tc.id);
                      showToast(`Filtre : ${tc.label}`, 'info');
                    }}
                    className={`cursor-pointer px-3 py-1.5 text-[9px] font-bold tracking-widest uppercase rounded border transition-all ${
                      voteCategoryFilter === tc.id
                        ? 'bg-custom-accent text-white border-custom-accent shadow-lg shadow-custom-accent/10'
                        : 'bg-white text-slate-600 border-slate-200 hover:text-custom-accent hover:border-custom-accent'
                    }`}
                  >
                    {tc.label}
                  </button>
                ))}
              </div>

              {/* Text Search field */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, quartier ou plaque..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-custom-accent focus:ring-1 focus:ring-custom-accent shadow-sm"
                />
              </div>

            </div>

            {/* Simulated Live Scrutin Grid layout */}
            {filteredCandidates.length === 0 ? (
              <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-xl shadow-sm">
                <Compass className="h-10 w-10 text-slate-400 mx-auto mb-3 animate-spin" />
                <p className="font-heading text-xs tracking-wider text-slate-500 uppercase">
                  Aucun chauffeur ne correspond à votre filtre de saisie.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredCandidates.map((c) => {
                  const alreadyVotedThisCategory = votedCategories[c.categoryId];
                  return (
                     <div 
                      key={c.id}
                      className="group relative bg-white border border-slate-200/80 rounded-2xl p-6 transition-all duration-500 hover:border-custom-accent/30 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1.5 overflow-hidden flex flex-col justify-between"
                    >
                      {/* Top thin aesthetic accent bar */}
                      <div className="absolute top-0 left-0 right-0 h-[3px] bg-slate-100 group-hover:bg-gradient-to-r group-hover:from-red-500 group-hover:to-amber-400 transition-all duration-500"></div>
                      
                      {/* Glow decorative effect */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-custom-accent/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                      <div>
                        {/* Beautiful Nominee Vehicle Card Cover Image */}
                        <div className="relative h-40 w-full overflow-hidden rounded-xl mb-4 bg-slate-900 border border-slate-100/10 shadow-sm">
                          <img
                            src={
                              (c.photo && String(c.photo).length > 0)
                                ? c.photo
                                : (c.categoryId === '13'
                                  ? "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80"
                                  : librevilleTaxi)
                            }
                            alt={c.photo ? `Photo de ${c.prenom} ${c.nom}` : `Véhicule de ${c.prenom} ${c.nom}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-[0.85]"
                            referrerPolicy="no-referrer"
                          />
                          {/* Floating Model Badge overlay */}
                          <div className="absolute bottom-2.5 left-2.5 bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded-md text-white font-mono text-[8px] font-bold tracking-wider">
                            🚗 {c.vehicleModel}
                          </div>
                          {/* Official Nominated Ribbon */}
                          <div className="absolute top-2.5 right-2.5 bg-amber-500 text-slate-950 font-heading font-black text-[7px] tracking-wider px-2 py-0.5 rounded-full uppercase">
                            Candidat Officiel
                          </div>
                        </div>

                        {/* Header block with avatar metrics */}
                        <div className="flex items-start justify-between mb-4 pt-1">
                          <div className="flex items-center space-x-3.5">
                            {/* Round initials avatar or loaded photo */}
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-50 to-amber-50 border border-amber-100 text-custom-accent font-display text-xs font-black overflow-hidden shadow-xs">
                              {c.photo ? (
                                <img src={c.photo} alt={c.nom} className="h-full w-full object-cover" />
                              ) : (
                                <span>{c.initials}</span>
                              )}
                            </div>
                            <div>
                              <h4 className="font-display text-sm font-black text-slate-900 transition-colors group-hover:text-custom-accent duration-300 flex items-center gap-1.5 flex-wrap">
                                <span>{c.prenom} {c.nom}</span>
                                {votedCandidateIds[c.id] && (
                                  <span className="inline-block bg-emerald-100 text-emerald-800 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider scale-95">
                                    Soutenu ✓
                                  </span>
                                )}
                              </h4>
                              <span className="font-heading text-[8.5px] font-extrabold text-custom-accent/90 uppercase tracking-widest block mt-0.5">
                                {c.categoryName}
                              </span>
                            </div>
                          </div>

                          {/* Votes Indicator */}
                          <div className="flex items-center space-x-1.5 bg-gradient-to-r from-red-50 to-rose-50 border border-red-100/50 px-3 py-1.5 rounded-full text-custom-accent transition-transform duration-300 group-hover:scale-105">
                            <Flame className="h-3 w-3 animate-pulse shrink-0" />
                            <span className="font-heading text-[9.5px] font-black tracking-wider uppercase">
                              {c.votesCount} voX
                            </span>
                          </div>
                        </div>

                        <div className="w-full h-px bg-slate-100/80 mb-5"></div>

                        {/* Info specifications list */}
                        <div className="space-y-2.5 mb-6 font-sans text-xs text-slate-500 font-light font-sans">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-light">Zone d'activité :</span>
                            <span className="text-slate-800 font-semibold">{c.quartier || 'Libreville'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-light">Numéro de Plaque :</span>
                            <span className="text-slate-800 font-mono text-[11px] font-bold tracking-wider">{c.taxiNo || 'Non spécifié'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-405 font-light">Expérience :</span>
                            <span className="text-slate-800">{c.experience || 'Plus de 5 ans'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-405 font-light">Modèle auto :</span>
                            <span className="text-slate-800 font-medium italic">{c.vehicleModel || 'Corolla'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Scrutin Direct Trigger (Luxury rounded-full buttons) */}
                      <button
                        onClick={() => initiateVotePayment(c)}
                        className="w-full cursor-pointer py-3.5 rounded-full text-[10px] tracking-widest uppercase font-heading font-extrabold transition-all duration-300 bg-custom-accent text-white hover:bg-red-700 border border-custom-accent hover:shadow-xl hover:shadow-red-500/10 flex items-center justify-center space-x-1.5"
                      >
                        <Flame className="h-4 w-4 shrink-0 text-amber-300 animate-pulse" />
                        <span>
                          Voter pour ce candidat
                        </span>
                      </button>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ====================================
            TAB 4: LES 22 TROPHÉES / CATEGORIES
            ==================================== */}
        {activeTab === 'categories' && (
          <CategoriesPage
            categoryGroups={categoryGroups}
            categories={activeCategories}
            candidates={candidates}
            evolutionNote={evolutionNote}
            onNavigateToVote={navigateToVote}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanel
            categoryGroups={categoryGroups}
            categories={managedCategories}
            candidates={candidates}
            evolutionNote={evolutionNote}
            banners={banners}
            sponsors={sponsors}
            voteConfig={voteConfig}
            onUpdateCategoryGroups={updateCategoryGroups}
            onUpdateEvolutionNote={updateEvolutionNote}
            onAddCategory={addCategory}
            onUpdateCategory={updateCategory}
            onDeleteCategory={deleteCategory}
            onUpdateCandidates={handleAdminUpdateCandidates}
            onUpdateBanners={updateBanners}
            onUpdateSponsors={updateSponsors}
            onUpdateVoteConfig={updateVoteConfig}
            onResetDefaults={resetToDefaults}
            onClose={() => {
              setActiveTab('accueil');
              window.location.hash = '';
            }}
          />
        )}

        {/* ====================================
            TAB 5: PARTICIPER (INSCRIPTION VOTANT)
            ==================================== */}
        {activeTab === 'inscriptions' && (
          <div className="item-fade-in mx-auto max-w-3xl px-4 py-12">
            
            {/* Header intro */}
            <div className="text-center mb-8">
              <span className="font-heading text-[10px] text-custom-accent font-bold tracking-widest uppercase">
                PLATEFORME D'INSCRIPTION OFFICIELLE
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-black text-slate-900 mt-1.5 mb-3">
                Inscriptions
              </h2>
              <p className="font-sans text-xs sm:text-sm text-slate-550 max-w-sm mx-auto">
                Inscrivez-vous en tant que candidat chauffeur ou en tant que votant.
              </p>
            </div>

            {/* Toggle between portals */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <button
                onClick={() => setInscriptionPortal('candidat')}
                className={`cursor-pointer px-6 py-2.5 rounded-full font-montserrat font-bold text-xs uppercase tracking-widest transition-all ${
                  inscriptionPortal === 'candidat'
                    ? 'bg-custom-accent text-white shadow-lg'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Je suis Candidat
              </button>
              {voteConfig?.votingEnabled ? (
                <button
                  onClick={() => setInscriptionPortal('votant')}
                  className={`cursor-pointer px-6 py-2.5 rounded-full font-montserrat font-bold text-xs uppercase tracking-widest transition-all ${
                    inscriptionPortal === 'votant'
                      ? 'bg-custom-accent text-white shadow-lg'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Je suis Votant
                </button>
              ) : (
                <button
                  onClick={() => openVoterPortal()}
                  className="cursor-pointer px-6 py-2.5 rounded-full font-montserrat font-bold text-xs uppercase tracking-widest transition-all bg-slate-100 text-slate-600"
                >
                  Je suis Votant
                </button>
              )}
            </div>

            {inscriptionPortal === 'votant' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center space-x-3.5 mb-6">
                <User className="h-5 w-5 text-custom-accent shrink-0" />
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900 leading-tight">Portail Citoyen Votant</h3>
                  <p className="font-sans text-xs text-slate-500 font-light leading-snug">Remplissez les informations ci-dessous pour valider votre identité.</p>
                </div>
              </div>

              {voterSuccess || isRegisteredVoter ? (
                <div className="text-center py-6">
                  <div className="h-12 w-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 font-black">
                    ✓
                  </div>
                  <h4 className="font-display text-sm font-bold text-slate-900">Profil votant identifié !</h4>
                  <p className="font-sans text-xs text-slate-650 max-w-sm mx-auto leading-relaxed mt-2">
                    Bienvenue, <span className="text-custom-accent font-semibold">{voterName}</span>. Votre signature est active. Vous pouvez dès maintenant vous rendre sur la page <strong>"Espace Vote"</strong> pour soutenir vos candidats favoris.
                  </p>
                  <button
                    onClick={() => openVoterPortal()}
                    className="cursor-pointer bg-custom-accent hover:bg-custom-accent/80 text-white font-heading text-[10px] uppercase font-bold tracking-widest py-2 px-5 rounded mt-4.5"
                  >
                    Voter Maintenant
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateVoterProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-heading text-[9.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Prénom *</label>
                      <input
                        type="text"
                        required
                        placeholder="Votre prénom"
                        value={voterForm.prenom}
                        onChange={(e) => setVoterForm({...voterForm, prenom: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded py-2.5 px-3 text-xs text-slate-855 placeholder-slate-405 focus:outline-none focus:ring-1 focus:ring-custom-accent focus:border-custom-accent"
                      />
                    </div>
                    <div>
                      <label className="block font-heading text-[9.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Nom *</label>
                      <input
                        type="text"
                        required
                        placeholder="Votre nom"
                        value={voterForm.nom}
                        onChange={(e) => setVoterForm({...voterForm, nom: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded py-2.5 px-3 text-xs text-slate-855 placeholder-slate-405 focus:outline-none focus:ring-1 focus:ring-custom-accent focus:border-custom-accent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-heading text-[9.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Téléphone *</label>
                      <input
                        type="tel"
                        required
                        placeholder="Ex: +241 07 72 09 01"
                        value={voterForm.telephone}
                        onChange={(e) => setVoterForm({...voterForm, telephone: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded py-2.5 px-3 text-xs text-slate-855 placeholder-slate-405 focus:outline-none focus:ring-1 focus:ring-custom-accent focus:border-custom-accent"
                      />
                    </div>
                    <div>
                      <label className="block font-heading text-[9.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Adresse Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="email@exemple.com"
                        value={voterForm.email}
                        onChange={(e) => setVoterForm({...voterForm, email: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded py-2.5 px-3 text-xs text-slate-855 placeholder-slate-405 focus:outline-none focus:ring-1 focus:ring-custom-accent focus:border-custom-accent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-heading text-[9.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Quartier de Résidence *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Alibandeng, Libreville"
                      value={voterForm.quartier}
                      onChange={(e) => setVoterForm({...voterForm, quartier: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded py-2.5 px-3 text-xs text-slate-855 placeholder-slate-405 focus:outline-none focus:ring-1 focus:ring-custom-accent focus:border-custom-accent"
                    />
                  </div>

                  <button
                    type="submit"
                    className="cursor-pointer w-full bg-custom-accent hover:bg-custom-accent/80 text-white font-heading text-xs font-bold uppercase tracking-widest py-3.5 rounded transition-all"
                  >
                    Valider mon Enregistrement Votant
                  </button>
                </form>
              )}

              {/* Formulaire d'inscription pour être notifié quand le vote ouvre */}
              {!voteConfig.votingEnabled && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                    <h4 className="font-display text-sm font-bold text-slate-900 mb-2">Soyez notifié quand le vote ouvre</h4>
                    <p className="font-sans text-xs text-slate-600 mb-4">
                      Le vote n'est pas encore ouvert. Inscrivez-vous pour recevoir une notification quand l'admin lancera le feu vert.
                    </p>
                    {voterNotifySuccess ? (
                      <div className="text-center py-4">
                        <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 font-black">
                          ✓
                        </div>
                        <p className="font-sans text-xs text-slate-650">Vous serez notifié quand le vote ouvrira !</p>
                      </div>
                    ) : (
                      <form onSubmit={handleVoterNotifyRegister} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-heading text-[9.5px] font-bold text-slate-600 uppercase tracking-wider mb-1">Prénom *</label>
                            <input
                              type="text"
                              required
                              placeholder="Votre prénom"
                              value={voterNotifyForm.prenom}
                              onChange={(e) => setVoterNotifyForm({...voterNotifyForm, prenom: e.target.value})}
                              className="w-full bg-white border border-slate-200 rounded py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-custom-accent focus:border-custom-accent"
                            />
                          </div>
                          <div>
                            <label className="block font-heading text-[9.5px] font-bold text-slate-600 uppercase tracking-wider mb-1">Nom *</label>
                            <input
                              type="text"
                              required
                              placeholder="Votre nom"
                              value={voterNotifyForm.nom}
                              onChange={(e) => setVoterNotifyForm({...voterNotifyForm, nom: e.target.value})}
                              className="w-full bg-white border border-slate-200 rounded py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-custom-accent focus:border-custom-accent"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-heading text-[9.5px] font-bold text-slate-600 uppercase tracking-wider mb-1">Téléphone *</label>
                            <input
                              type="tel"
                              required
                              placeholder="Ex: +241 07 72 09 01"
                              value={voterNotifyForm.telephone}
                              onChange={(e) => setVoterNotifyForm({...voterNotifyForm, telephone: e.target.value})}
                              className="w-full bg-white border border-slate-200 rounded py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-custom-accent focus:border-custom-accent"
                            />
                          </div>
                          <div>
                            <label className="block font-heading text-[9.5px] font-bold text-slate-600 uppercase tracking-wider mb-1">Email *</label>
                            <input
                              type="email"
                              required
                              placeholder="Ex: email@exemple.com"
                              value={voterNotifyForm.email}
                              onChange={(e) => setVoterNotifyForm({...voterNotifyForm, email: e.target.value})}
                              className="w-full bg-white border border-slate-200 rounded py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-custom-accent focus:border-custom-accent"
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          className="cursor-pointer w-full bg-amber-500 hover:bg-amber-600 text-white font-heading text-[10px] font-bold uppercase tracking-widest py-2.5 rounded transition-all"
                        >
                          M'inscrire pour être notifié
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>

            )}

          </div>
        )}

        {/* ====================================
            TAB: CANDIDAT (embedded in inscriptions)
            ==================================== */}
        {activeTab === 'inscriptions' && inscriptionPortal === 'candidat' && (
          <div className="item-fade-in mx-auto max-w-2xl px-4 pb-12">
            
            {/* Header intro */}
            <div className="text-center mb-10">
              <span className="font-heading text-[10px] text-custom-accent font-bold tracking-widest uppercase">
                PROFIL PROFESSIONNEL • INTÉGRER LA SÉLECTION OFFICIELLE
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-black text-slate-900 mt-1.5 mb-3">
                Candidature Chauffeur Professionnel
              </h2>
              <p className="font-sans text-xs sm:text-sm text-slate-550 max-w-sm mx-auto">
                Soumettez votre dossier de distinctions pour rejoindre les candidats en lice et recevoir les votes du public gabonais.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center space-x-3.5 mb-6">
                <Car className="h-5 w-5 text-custom-accent shrink-0" />
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900 leading-tight">Portail Chauffeur Candidat</h3>
                  <p className="font-sans text-xs text-slate-500 font-light leading-snug">Soumettez votre plissé de candidature officielle aux examinateurs de Niongo Agency.</p>
                </div>
              </div>

              {chauffeurSuccess ? (
                <div className="text-center py-6">
                  <div className="h-12 w-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 font-black">
                    ✓
                  </div>
                  <h4 className="font-display text-sm font-bold text-slate-900">Dossier reçu !</h4>
                  <p className="font-sans text-xs text-slate-650 max-w-sm mx-auto leading-relaxed mt-2">
                    Merci beaucoup. Votre dossier est entre les mains du jury d'examen civique. Un accusé de validation de conformité vous sera émis par canal téléphonique ou WhatsApp sous peu.
                  </p>
                  <button
                    onClick={() => setChauffeurSuccess(false)}
                    className="cursor-pointer text-custom-accent hover:text-custom-accent/80 font-sans text-[11px] tracking-wide uppercase underline mt-4.5 block mx-auto font-medium"
                  >
                    Soumettre un nouveau dossier
                  </button>
                </div>
              ) : (
                <form onSubmit={handleChauffeurCandidacy} className="space-y-4">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-heading text-[9.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Prénom *</label>
                      <input
                        type="text"
                        required
                        placeholder="Jean-Baptiste"
                        value={chauffeurForm.prenom}
                        onChange={(e) => setChauffeurForm({...chauffeurForm, prenom: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded py-2.5 px-3 text-xs text-slate-855 placeholder-slate-405 focus:outline-none focus:ring-1 focus:ring-custom-accent focus:border-custom-accent"
                      />
                    </div>
                    <div>
                      <label className="block font-heading text-[9.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Nom *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ondo"
                        value={chauffeurForm.nom}
                        onChange={(e) => setChauffeurForm({...chauffeurForm, nom: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded py-2.5 px-3 text-xs text-slate-855 placeholder-slate-405 focus:outline-none focus:ring-1 focus:ring-custom-accent focus:border-custom-accent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-heading text-[9.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Téléphone *</label>
                      <input
                        type="tel"
                        required
                        placeholder="Ex: +241 07 20 87 46"
                        value={chauffeurForm.telephone}
                        onChange={(e) => setChauffeurForm({...chauffeurForm, telephone: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded py-2.5 px-3 text-xs text-slate-855 placeholder-slate-405 focus:outline-none focus:ring-1 focus:ring-custom-accent focus:border-custom-accent"
                      />
                    </div>
                    <div>
                      <label className="block font-heading text-[9.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Immatriculation du véhicule *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: GA-9821-AB"
                        value={chauffeurForm.immatriculation}
                        onChange={(e) => setChauffeurForm({...chauffeurForm, immatriculation: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded py-2.5 px-3 text-xs text-slate-855 placeholder-slate-405 focus:outline-none focus:ring-1 focus:ring-custom-accent focus:border-custom-accent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-heading text-[9.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Quartier & Secteur d'activité *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Nzeng-Ayong, Libreville"
                        value={chauffeurForm.quartier}
                        onChange={(e) => setChauffeurForm({...chauffeurForm, quartier: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded py-2.5 px-3 text-xs text-slate-855 placeholder-slate-405 focus:outline-none focus:ring-1 focus:ring-custom-accent focus:border-custom-accent"
                      />
                    </div>
                    <div>
                      <label className="block font-heading text-[9.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Marque & Modèle véhicule</label>
                      <input
                        type="text"
                        placeholder="Ex: Toyota Corolla 2020"
                        value={chauffeurForm.modele}
                        onChange={(e) => setChauffeurForm({...chauffeurForm, modele: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded py-2.5 px-3 text-xs text-slate-855 placeholder-slate-405 focus:outline-none focus:ring-1 focus:ring-custom-accent focus:border-custom-accent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-heading text-[9.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Âge du chauffeur *</label>
                    <input
                      type="number"
                      required
                      min="18"
                      max="99"
                      placeholder="Ex: 35"
                      value={chauffeurAge}
                      onChange={(e) => setChauffeurAge(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded py-2.5 px-3 text-xs text-slate-855 placeholder-slate-405 focus:outline-none focus:ring-1 focus:ring-custom-accent focus:border-custom-accent"
                    />
                    <p className="text-[9px] text-slate-400 mt-0.5">Catégories basées sur l'âge : Révélation de l'Année et Chauffeur le plus vieux en activité (enveloppe 100 000 XAF)</p>
                  </div>
                  <div>
                    <label className="block font-heading text-[9.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Années d'expérience *</label>
                      <select
                        value={chauffeurForm.experience}
                        onChange={(e) => setChauffeurForm({...chauffeurForm, experience: e.target.value})}
                        className="w-full bg-white border border-slate-205 rounded py-2.5 px-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-custom-accent focus:border-custom-accent"
                      >
                        {EXPERIENCE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value} className="bg-white text-slate-800">{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-heading text-[9.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">État général du Taxi *</label>
                      <select
                        value={chauffeurForm.etatVehicule}
                        onChange={(e) => setChauffeurForm({...chauffeurForm, etatVehicule: e.target.value})}
                        className="w-full bg-white border border-slate-205 rounded py-2.5 px-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-custom-accent focus:border-custom-accent"
                      >
                        {VEHICLE_STATUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value} className="bg-white text-slate-800">{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-heading text-[9.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Catégorie souhaitée *</label>
                    <select
                      value={chauffeurForm.categorie}
                      onChange={(e) => setChauffeurForm({...chauffeurForm, categorie: e.target.value})}
                      className="w-full bg-white border border-slate-205 rounded py-2.5 px-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-custom-accent focus:border-custom-accent"
                    >
                      {activeCategories.filter(c => c.group === '1' || c.group === '2').map(c => (
                        <option key={c.id} value={c.id} className="bg-white text-slate-800">{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-heading text-[9.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Pourquoi méritez-vous d'être distingué par Niongo Agency ? *</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Décrivez brièvement vos valeurs de conduite courtoise, propreté et votre histoire civique..."
                      value={chauffeurForm.description}
                      onChange={(e) => setChauffeurForm({...chauffeurForm, description: e.target.value})}
                      className="w-full bg-white border border-slate-202 rounded py-2 px-3 text-xs text-slate-855 placeholder-slate-405 focus:outline-none focus:ring-1 focus:ring-custom-accent focus:border-custom-accent"
                    />
                  </div>

                  {/* Photo de profil du candidat */}
                  <div>
                    <label className="block font-heading text-[9.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Photo de profil du Candidat (Recommandé)
                    </label>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          handlePhotoFile(file);
                        }
                      }}
                      className={`relative border border-dashed rounded-xl p-5 flex flex-col items-center justify-center transition-all ${
                        isDragOver
                          ? 'border-custom-accent bg-red-500/5'
                          : photoPreview
                          ? 'border-emerald-500 bg-emerald-500/5'
                          : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                      }`}
                    >
                      {photoPreview ? (
                        <div className="relative flex flex-col items-center justify-center w-full">
                          <img
                            src={photoPreview}
                            alt="Candidat prévisualisation"
                            className="h-28 w-28 object-cover rounded-full border-4 border-white shadow-md animate-fade-in"
                          />
                          <p className="text-[10px] text-emerald-600 font-bold mt-2 flex items-center space-x-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Photo chargée avec succès !</span>
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setPhotoPreview(null);
                              setChauffeurForm({ ...chauffeurForm, photo: '' });
                            }}
                            className="mt-2 text-[9px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wider flex items-center space-x-1 py-1 px-2.5 bg-red-50 hover:bg-red-100 rounded-full cursor-pointer transition-all"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Supprimer</span>
                          </button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="h-7 w-7 text-slate-400 mx-auto mb-2 animate-bounce" />
                          <p className="text-xs font-semibold text-slate-700">Glissez-déposez la photo ici</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 mb-2.5">PNG, JPG ou JPEG (Max. 5 Mo)</p>
                          <button
                            type="button"
                            onClick={() => document.getElementById('photo-upload-input')?.click()}
                            className="cursor-pointer bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[9px] uppercase tracking-wider px-3.5 py-1.5 rounded-md transition-all shadow-xs"
                          >
                            Parcourir les fichiers
                          </button>
                          <input
                            id="photo-upload-input"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handlePhotoFile(file);
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="cursor-pointer w-full bg-custom-accent hover:bg-custom-accent/80 text-white font-heading text-xs font-bold uppercase tracking-widest py-3.5 rounded transition-all shadow-md shadow-red-500/10"
                  >
                    Soumettre ma Candidature Officielle
                  </button>

                </form>
              )}
            </div>

          </div>
        )}

        {/* ====================================
            TAB 7: PARTENARIAT & SPONSORS (SOLLICITATION MARQUE)
            ==================================== */}
        {activeTab === 'sponsors' && (
          <div className="item-fade-in mx-auto max-w-5xl px-4 py-12">
            
            {/* Header intro */}
            <div className="text-center mb-10">
              <span className="font-heading text-[10px] text-custom-accent font-bold tracking-widest uppercase">
                ASSOCIATION DE MARQUE • PACKAGES ÉVÉNEMENTIELS
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-black text-slate-900 mt-1.5 mb-3">
                Sponsoring & Partenariats
              </h2>
              <p className="font-sans text-xs sm:text-sm text-slate-550 max-w-sm mx-auto">
                Découvrez nos offres d'exposition nationale et soumettez votre demande d'association au comité d'organisation.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* PARTNERSHIP PACKAGES DIAGRAM */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                
                <div className="flex items-center space-x-2.5 text-custom-accent mb-4">
                  <Trophy className="h-4.5 w-4.5" />
                  <span className="font-heading text-[10px] font-bold tracking-widest uppercase">
                    LES PACKAGES DE PARTENARIAT NIONGO
                  </span>
                </div>

                <p className="font-sans text-[11px] text-slate-500 leading-normal font-light mb-5">
                  Quatre niveaux de partenariat, chacun avec des opportunités stratégiques uniques (cliquez sur un niveau pour le pré-sélectionner) :
                </p>

                <div className="space-y-3.5">
                  
                  {/* Diamant */}
                  <div 
                    onClick={() => {
                      setPartnerForm({...partnerForm, packageSponsor: 'diamant'});
                      showToast("Sponsor Diamant présélectionné", "info");
                    }}
                    className={`cursor-pointer p-3.5 rounded-lg border transition-all ${
                      partnerForm.packageSponsor === 'diamant' 
                        ? 'bg-red-500/5 border-custom-accent shadow-md ring-1 ring-custom-accent' 
                        : 'bg-slate-50 border-slate-200 hover:border-custom-accent/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-display text-xs font-bold text-slate-900 uppercase tracking-wider">DIAMANT SPONSOR</span>
                      <span className="font-heading text-[11px] font-bold text-custom-accent">20 000 000 FCFA</span>
                    </div>
                    <p className="font-sans text-[10px] text-slate-650 leading-snug font-light">
                      Sponsor titre. Visibilité première, spot audio/vidéo prioritaires, stand VIP au Village et Gala, possibilité de nommer une catégorie de trophée.
                    </p>
                  </div>

                  {/* Gold */}
                  <div 
                    onClick={() => {
                      setPartnerForm({...partnerForm, packageSponsor: 'gold'});
                      showToast("Sponsor Or présélectionné", "info");
                    }}
                    className={`cursor-pointer p-3.5 rounded-lg border transition-all ${
                      partnerForm.packageSponsor === 'gold' 
                        ? 'bg-red-500/5 border-custom-accent shadow-md ring-1 ring-custom-accent' 
                        : 'bg-slate-50 border-slate-200 hover:border-custom-accent/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-display text-xs font-bold text-slate-900 uppercase tracking-wider">GOLD SPONSOR</span>
                      <span className="font-heading text-[11px] font-bold text-custom-accent">10 000 000 FCFA</span>
                    </div>
                    <p className="font-sans text-[10px] text-slate-655 leading-snug font-light">
                      Logo sur tous les supports centraux, citation audio, stand d'expo, 6 invitations aux tables d'honneur prestige au Gala.
                    </p>
                  </div>

                  {/* Silver */}
                  <div 
                    onClick={() => {
                      setPartnerForm({...partnerForm, packageSponsor: 'silver'});
                      showToast("Sponsor Argent présélectionné", "info");
                    }}
                    className={`cursor-pointer p-3.5 rounded-lg border transition-all ${
                      partnerForm.packageSponsor === 'silver' 
                        ? 'bg-red-500/5 border-custom-accent shadow-md ring-1 ring-custom-accent' 
                        : 'bg-slate-50 border-slate-200 hover:border-custom-accent/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-display text-xs font-bold text-slate-900 uppercase tracking-wider">SILVER SPONSOR</span>
                      <span className="font-heading text-[11px] font-bold text-custom-accent">5 000 000 FCFA</span>
                    </div>
                    <p className="font-sans text-[10px] text-slate-655 leading-snug font-light">
                      Logo taille moyenne, zone centrale des supports, stand d'exposition au Village des Chauffeurs, 4 invitations Table Prestige.
                    </p>
                  </div>

                  {/* Bronze */}
                  <div 
                    onClick={() => {
                      setPartnerForm({...partnerForm, packageSponsor: 'bronze'});
                      showToast("Sponsor Bronze présélectionné", "info");
                    }}
                    className={`cursor-pointer p-3.5 rounded-lg border transition-all ${
                      partnerForm.packageSponsor === 'bronze' 
                        ? 'bg-red-500/5 border-custom-accent shadow-md ring-1 ring-custom-accent' 
                        : 'bg-slate-50 border-slate-200 hover:border-custom-accent/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-display text-xs font-bold text-slate-900 uppercase tracking-wider">BRONZE SPONSOR</span>
                      <span className="font-heading text-[11px] font-bold text-custom-accent">2 000 000 FCFA</span>
                    </div>
                    <p className="font-sans text-[10px] text-slate-655 leading-snug font-light">
                      Logo de petite taille calé au bas des supports, citation radio, 2 invitations billets simples pour le Gala d'excellence.
                    </p>
                  </div>

                </div>
              </div>

              {/* PARTNERSHIP FORM ENTRY */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <span className="font-heading text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">SOLLICITER UN PARRAINAGE</span>
                <h4 className="font-display text-sm font-bold text-slate-900 mb-4">Envoyez une requête d'association de marque :</h4>

                {partnerSuccess ? (
                  <div className="text-center py-6 bg-emerald-500/5 rounded-xl border border-emerald-520/20 text-emerald-800 p-4">
                    <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 font-semibold text-lg">
                      ✓
                    </div>
                    <p className="font-sans text-xs font-bold">Demande reçue par Niongo Agency !</p>
                    <p className="font-sans text-[11px] text-slate-600 mt-1.5 px-2 leading-relaxed font-light">
                      Un conseiller de projet réactif prendra contact avec vous d'ici 24 heures.
                    </p>
                    <button 
                      onClick={() => setPartnerSuccess(false)}
                      className="text-custom-accent hover:underline text-[10px] uppercase font-bold tracking-wider mt-4 cursor-pointer block mx-auto"
                    >
                      Faire une autre demande
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handlePartnerRequest} className="space-y-4 text-xs font-sans">
                    <div>
                      <label className="block text-slate-600 mb-1 font-bold font-heading text-[9.5px] uppercase">Nom de l'Entreprise *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Compagnie des Assurances du Gabon"
                        value={partnerForm.nomEntreprise}
                        onChange={(e) => setPartnerForm({...partnerForm, nomEntreprise: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded py-2 px-3 text-xs text-slate-855 placeholder-slate-405 focus:outline-none focus:ring-1 focus:ring-custom-accent focus:border-custom-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1 font-bold font-heading text-[9.5px] uppercase">Nom du Responsable Contact *</label>
                      <input
                        type="text"
                        required
                        placeholder="Votre nom complet"
                        value={partnerForm.contactNom}
                        onChange={(e) => setPartnerForm({...partnerForm, contactNom: e.target.value})}
                        className="w-full bg-white border border-slate-205 rounded py-2 px-3 text-xs text-slate-855 placeholder-slate-405 focus:outline-none focus:ring-1 focus:ring-custom-accent focus:border-custom-accent"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-slate-600 mb-1 font-bold font-heading text-[9.5px] uppercase">Adresse email *</label>
                        <input
                          type="email"
                          required
                          placeholder="Ex: direction@entreprise.ga"
                          value={partnerForm.email}
                          onChange={(e) => setPartnerForm({...partnerForm, email: e.target.value})}
                          className="w-full bg-white border border-slate-205 rounded py-2 px-3 text-xs text-slate-855 placeholder-slate-405 focus:outline-none focus:ring-1 focus:ring-custom-accent focus:border-custom-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1 font-bold font-heading text-[9.5px] uppercase">Contact de communication *</label>
                        <input
                          type="tel"
                          required
                          placeholder="Ex: +241 62 55 90 55"
                          value={partnerForm.telephone}
                          onChange={(e) => setPartnerForm({...partnerForm, telephone: e.target.value})}
                          className="w-full bg-white border border-slate-205 rounded py-2 px-3 text-xs text-slate-855 placeholder-slate-405 focus:outline-none focus:ring-1 focus:ring-custom-accent focus:border-custom-accent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1 font-bold font-heading text-[9.5px] uppercase">Package choisi *</label>
                      <select
                        value={partnerForm.packageSponsor}
                        onChange={(e) => setPartnerForm({...partnerForm, packageSponsor: e.target.value as any})}
                        className="w-full bg-white border border-slate-205 rounded py-2.5 px-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-custom-accent focus:border-custom-accent"
                      >
                        <option value="diamant">Diamant - 20 000 000 FCFA</option>
                        <option value="gold">Gold - 10 000 000 FCFA</option>
                        <option value="silver">Silver - 5 000 000 FCFA</option>
                        <option value="bronze">Bronze - 2 000 000 FCFA</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="cursor-pointer w-full bg-slate-900 hover:bg-slate-950 text-white font-heading text-[10px] font-bold uppercase tracking-widest py-3 rounded shadow-md transition-all text-center"
                    >
                      Soumettre ma Demande de Partenariat (Niongo Agency)
                    </button>
                  </form>
                )}

              </div>

            </div>

          </div>
        )}

      </main>


      {/* Sponsors & Partenaires Banner Zone */}
      <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 py-12 border-t border-slate-700">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <p className="font-montserrat font-bold text-[9px] text-amber-400 uppercase tracking-widest mb-2">Nos Sponsors et Partenaires</p>
          <h3 className="font-essentials text-xl font-black text-white uppercase mb-6">ILS SOUTIENNENT L'ÉVÉNEMENT</h3>
          <div className="flex flex-wrap items-center justify-center gap-6 min-h-[80px]">
            {sponsors.filter(s => s.active).length > 0 ? sponsors.filter(s => s.active).map(sp => (
              sp.websiteUrl
                ? <a key={sp.id} href={sp.websiteUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                    <img src={sp.logoUrl} alt={sp.name} className="h-12 max-w-[140px] object-contain" />
                  </a>
                : <img key={sp.id} src={sp.logoUrl} alt={sp.name} className="h-12 max-w-[140px] object-contain" />
            )) : (
              <p className="font-montserrat text-xs text-slate-400 italic">Les logos de nos partenaires s'afficheront ici — gérez-les depuis l'administration.</p>
            )}
          </div>
          <div className="mt-8 border-t border-slate-700 pt-6">
            <p className="font-montserrat text-xs text-slate-400">Devenez partenaire : <a href="https://wa.me/24162559055" className="text-amber-400 font-bold hover:underline">+241 62 55 90 55</a></p>
          </div>
        </div>
      </section>

      {/* Ad Banners Zone */}
      <section className="bg-slate-100 border-y border-slate-200 py-4">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            {banners.filter(b => b.active).length > 0 ? banners.filter(b => b.active).map(bn => (
              bn.linkUrl
                ? <a key={bn.id} href={bn.linkUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:flex-1 block rounded-xl overflow-hidden hover:opacity-90 transition-opacity">
                    <img src={bn.imageUrl} alt={bn.label} className="w-full h-auto object-cover" />
                  </a>
                : <div key={bn.id} className="w-full sm:flex-1 rounded-xl overflow-hidden">
                    <img src={bn.imageUrl} alt={bn.label} className="w-full h-auto object-cover" />
                  </div>
            )) : (
              <>
                <div className="w-full sm:w-1/2 bg-white border-2 border-dashed border-slate-300 rounded-xl h-24 flex items-center justify-center text-slate-400 font-montserrat text-[10px] uppercase tracking-widest">
                  Bannière 1 — Configurez dans l'admin
                </div>
                <div className="w-full sm:w-1/2 bg-white border-2 border-dashed border-slate-300 rounded-xl h-24 flex items-center justify-center text-slate-400 font-montserrat text-[10px] uppercase tracking-widest">
                  Bannière 2 — Configurez dans l'admin
                </div>
              </>
            )}
          </div>
        </div>
      </section>
      {/* Footer Branding Area from PDF info */}
      <footer className="border-t border-slate-200 bg-slate-50 py-12">
        <div className="mx-auto max-w-5xl px-4 text-center space-y-6">
          <div className="flex items-center justify-center space-x-2.5">
            <img src={logoVolants} alt="Les Volants du Gabon" className="h-8 w-auto object-contain" />
            <span className="font-display text-md font-extrabold tracking-tight text-slate-900">
              Les Volants du Gabon
            </span>
          </div>

          <p className="max-w-md mx-auto font-sans text-xs text-slate-500 leading-relaxed font-light">
            La première cérémonie nationale de distinction et de professionnalisation des acteurs de taxis, VTC et du transport interurbain au Gabon.
          </p>

          <div className="h-px w-10 bg-custom-accent/30 mx-auto"></div>

          {/* Correct Contacts representation from Page 1 / 14 */}
          <div className="flex flex-col space-y-1.5 text-center font-sans text-[11px] text-slate-650">
            <p className="font-medium tracking-wide">Organisé par <span className="text-custom-accent font-extrabold">Niongo Agency · Naming & Management</span></p>
            <p>Email officiel : <a href="mailto:niongoagency@gmail.com" className="text-slate-800 hover:text-custom-accent font-mono font-medium">niongoagency@gmail.com</a></p>
            <p>Support téléphonique & WhatsApp : <a 
  href="https://wa.me/24162559055" 
  target="_blank" 
  rel="noopener noreferrer"
  className="hover:underline"
>
  <span className="text-slate-900 font-mono font-bold">+241 62 55 90 55</span>
</a></p>
          </div>

          <p className="font-heading text-[9px] tracking-[0.25em] text-slate-400 uppercase">
            © 2026 LES VOLANTS DU GABON • PRODUIT PAR NIONGO AGENCY • TOUS DROITS RÉSERVÉS
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              window.location.hash = '#admin';
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="cursor-pointer font-montserrat text-[9px] text-slate-300 hover:text-slate-500 transition-colors"
          >
            Administration
          </button>
        </div>
      </footer>

      {/* Dynamic E-billing Modal Portal */}
      {activeVoteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-650 to-red-750 px-6 py-4.5 text-white flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3 text-white">
                <CreditCard className="h-5 w-5 text-amber-300 shrink-0" />
                <div>
                  <h3 className="font-display text-sm font-black tracking-wider uppercase">Guichet de Vote Securisé</h3>
                  <p className="text-[10px] text-white/80 font-mono">ID: {activeVoteCandidate.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveVoteCandidate(null)}
                className="cursor-pointer text-white/85 hover:text-white hover:bg-white/15 p-1.5 rounded-full transition-all"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-grow">
              {paymentStep === 'select' && (
                <>
                  {/* Candidate Bio Preview */}
                  <div className="flex items-center space-x-3.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-custom-accent/10 border border-custom-accent/25 flex items-center justify-center font-bold text-xs text-custom-accent overflow-hidden">
                      {activeVoteCandidate.photo ? (
                        <img src={activeVoteCandidate.photo} alt={activeVoteCandidate.nom} className="h-full w-full object-cover" />
                      ) : (
                        <span>{activeVoteCandidate.initials}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-display text-sm font-black text-slate-900">
                        {activeVoteCandidate.prenom} {activeVoteCandidate.nom}
                      </h4>
                      <p className="text-[10px] text-slate-550 font-heading uppercase tracking-wider">{activeVoteCandidate.categoryName}</p>
                    </div>
                  </div>

                  {/* Pack Selector Title */}
                  <div className="space-y-2.5">
                    <label className="block font-heading text-[10px] font-black text-slate-700 uppercase tracking-widest">
                      1. Sélectionnez votre Pack de Votes :
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { size: 1, price: 100, desc: "1 Voix instantanée" },
                        { size: 5, price: 500, desc: "Soutien populaire" },
                        { size: 10, price: 1000, desc: "Propulsion Champion" },
                      ].map((pack) => (
                        <button
                          key={pack.size}
                          type="button"
                          onClick={() => setSelectedPackSize(pack.size)}
                          className={`flex flex-col items-center justify-center p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                            selectedPackSize === pack.size
                              ? 'border-custom-accent bg-red-500/5 shadow-xs'
                              : 'border-slate-100 hover:border-slate-200 bg-white'
                          }`}
                        >
                          <span className="font-heading text-lg font-black text-slate-900">{pack.size}</span>
                          <span className="text-[8.5px] font-black text-custom-accent uppercase tracking-wider leading-none mt-0.5">{pack.price} FCFA</span>
                          <span className="text-[7.5px] text-slate-400 font-light mt-1 text-center font-sans tracking-tight leading-tight">{pack.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Operator Selection */}
                  <div className="space-y-2.5">
                    <label className="block font-heading text-[10px] font-black text-slate-700 uppercase tracking-widest">
                      2. Opérateur de paiement mobile :
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Airtel Money */}
                      <button
                        type="button"
                        onClick={() => setPaymentOperator('airtel')}
                        className={`flex items-center space-x-3.5 p-3 rounded-xl border-2 transition-all text-left cursor-pointer ${
                          paymentOperator === 'airtel'
                            ? 'border-red-600 bg-red-500/5 shadow-inner'
                            : 'border-slate-100 hover:border-slate-200 bg-white'
                        }`}
                      >
                        <div className="h-8 w-8 shrink-0 rounded-full bg-red-600 flex flex-col items-center justify-center text-white ring-2 ring-red-200/50 shadow-xs">
                          <span className="font-sans text-[7.5px] font-black tracking-tighter leading-none">airtel</span>
                          <span className="text-[5.5px] font-black tracking-widest text-amber-300 uppercase leading-none mt-0.5">money</span>
                        </div>
                        <div>
                          <p className="font-display text-xs font-black text-slate-900 leading-tight">Airtel Money</p>
                          <p className="text-[8px] text-red-600 font-black uppercase tracking-wider">Frais : 0%</p>
                        </div>
                      </button>

                      {/* Moov Money */}
                      <button
                        type="button"
                        onClick={() => setPaymentOperator('moov')}
                        className={`flex items-center space-x-3.5 p-3 rounded-xl border-2 transition-all text-left cursor-pointer ${
                          paymentOperator === 'moov'
                            ? 'border-amber-500 bg-amber-500/5 shadow-inner'
                            : 'border-slate-100 hover:border-slate-205 bg-white'
                        }`}
                      >
                        <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex flex-col items-center justify-center text-slate-950 ring-2 ring-amber-200/50 shadow-xs">
                          <span className="font-display text-[7.5px] font-extrabold tracking-tighter leading-none">Moov</span>
                          <span className="text-[5.5px] font-black tracking-widest text-slate-950 uppercase leading-none mt-0.5">money</span>
                        </div>
                        <div>
                          <p className="font-display text-xs font-black text-slate-900 leading-tight">Moov Money</p>
                          <p className="text-[8px] text-amber-600 font-black uppercase tracking-wider font-sans">Frais : 0%</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Phone Number Field */}
                  <div className="space-y-2">
                    <label className="block font-heading text-[10px] font-black text-slate-700 uppercase tracking-widest">
                      3. Saisissez votre numéro de téléphone :
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-mono font-bold border-r border-slate-100 pr-2 bg-slate-50 rounded-l-lg">
                        +241
                      </div>
                      <input
                        type="tel"
                        required
                        placeholder="Ex: 077826894"
                        value={paymentPhone}
                        onChange={(e) => setPaymentPhone(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg py-2.5 pl-18 pr-3 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-custom-accent focus:border-custom-accent placeholder-slate-350"
                      />
                    </div>
                    <p className="text-[8.5px] text-slate-400 font-light mt-0.5 leading-relaxed font-sans">
                      Une demande d'autorisation de prélèvement de {selectedPackSize * 100} FCFA sera envoyée sur ce compte.
                    </p>
                  </div>

                  {/* Secure CTA Pay Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!paymentPhone || paymentPhone.length < 6) {
                        showToast("Veuillez saisir un numéro de téléphone valide.", 'warn');
                        return;
                      }
                      setPaymentStep('processing');
                      setTimeout(() => {
                        executeVote(activeVoteCandidate, selectedPackSize);
                        setPaymentStep('success');
                      }, 3200);
                    }}
                    className="cursor-pointer w-full bg-slate-900 hover:bg-slate-950 text-white font-heading text-[10px] font-black uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2"
                  >
                    <span>SÉCURISER ET PAYER {selectedPackSize * 100} FCFA</span>
                  </button>
                </>
              )}

              {paymentStep === 'processing' && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="h-14 w-14 border-4 border-slate-100 border-t-red-650 rounded-full animate-spin"></div>
                  <div>
                    <h4 className="font-display text-sm font-black text-slate-900 uppercase tracking-wide">Paiement en cours...</h4>
                    <p className="font-sans text-xs text-slate-500 mt-2 max-w-sm leading-relaxed px-4">
                      Nous interrogeons le réseau mobile sécurisé de Gabon. <br />
                      Mettez votre terminal en veille et composez <span className="font-mono text-red-650 font-black">{paymentOperator === 'airtel' ? '*150#' : '*175#'}</span> pour valider votre code de sécurité de débit de <span className="font-bold underline">{selectedPackSize * 100} FCFA</span>.
                    </p>
                  </div>
                </div>
              )}

              {paymentStep === 'success' && (
                <div className="py-10 flex flex-col items-center justify-center text-center space-y-5 animate-fade-in">
                  <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-200">
                    <CheckCircle2 className="h-10 w-10 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="font-display text-base font-black text-slate-900 uppercase tracking-wide">Votes Enregistrés !</h4>
                    <p className="font-sans text-xs text-slate-500 mt-2 max-w-sm leading-relaxed px-4">
                      Votre transfert de <strong className="text-slate-800">{selectedPackSize * 100} FCFA</strong> a été compensé par l'opérateur avec succès. <br />
                      Félicitations, <strong className="text-emerald-600">{selectedPackSize} {selectedPackSize === 1 ? 'vote a' : 'votes ont'}</strong> été attribué(s) en direct à <strong className="text-slate-800">{activeVoteCandidate.prenom} {activeVoteCandidate.nom}</strong>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveVoteCandidate(null)}
                    className="cursor-pointer bg-slate-900 hover:bg-slate-950 text-white font-heading text-[9.5px] font-black uppercase tracking-wider px-6 py-2.5 rounded-lg border transition-all"
                  >
                    Fermer le guichet
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
