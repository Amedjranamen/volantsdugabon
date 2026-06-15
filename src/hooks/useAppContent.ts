import { useState, useEffect, useCallback } from 'react';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { Category, CategoryGroup, AppContentConfig } from '../types';
import { CATEGORIES, DEFAULT_CATEGORY_GROUPS, CATEGORY_EVOLUTION_NOTE } from '../data';

const STORAGE_KEY = 'volants_gabon_admin_content_v1';

const defaultConfig: AppContentConfig = {
  categoryGroups: DEFAULT_CATEGORY_GROUPS,
  categories: CATEGORIES.map((c) => ({ ...c, isActive: c.isActive !== false })),
  evolutionNote: CATEGORY_EVOLUTION_NOTE,
};

function loadConfig(): AppContentConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as AppContentConfig;
      return {
        categoryGroups: parsed.categoryGroups?.length ? parsed.categoryGroups : defaultConfig.categoryGroups,
        categories: parsed.categories?.length ? parsed.categories : defaultConfig.categories,
        evolutionNote: parsed.evolutionNote || defaultConfig.evolutionNote,
      };
    }
  } catch {
    /* fallback */
  }
  return defaultConfig;
}

function persistConfig(config: AppContentConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('persistConfig failed:', e);
  }
}

export function useAppContent() {
  // Start with local config by default; if Firestore becomes available we will switch
  const [config, setConfig] = useState<AppContentConfig>(() => loadConfig());

  // Persist to localStorage only when Firestore is NOT available. When Firestore is
  // configured we prefer it as the source of truth and will not read from localStorage.
  useEffect(() => {
    if (isFirebaseConfigured && db) return;
    persistConfig(config);
  }, [config]);

  // When Firestore becomes available, listen to the `siteConfig/content` document
  // and use its value as the authoritative source of truth.
  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;
    try {
      const ref = doc(db, 'siteConfig', 'content');
      const unsub = onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as any;
          const cfg: AppContentConfig = {
            categoryGroups: data.categoryGroups?.length ? data.categoryGroups : defaultConfig.categoryGroups,
            categories: data.categories?.length ? data.categories : defaultConfig.categories,
            evolutionNote: data.evolutionNote || defaultConfig.evolutionNote,
          };
          setConfig(cfg);
        } else {
          // If the doc does not exist, fall back to defaults (and keep localStorage untouched)
          setConfig(defaultConfig);
        }
      }, (err) => {
        console.error('siteConfig/content snapshot error', err);
      });
      return () => unsub();
    } catch (e) {
      console.error('Failed to subscribe to siteConfig/content:', e);
    }
  }, [isFirebaseConfigured, db]);

  const updateCategoryGroups = useCallback((groups: CategoryGroup[]) => {
    setConfig((prev) => ({ ...prev, categoryGroups: groups }));
    // Persist to Firestore
    (async () => {
      if (!isFirebaseConfigured || !db) return;
      try {
        await setDoc(doc(db, 'siteConfig', 'content'), { categoryGroups: groups, updatedAt: serverTimestamp() }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'siteConfig/content');
      }
    })();
  }, []);

  const updateCategories = useCallback((categories: Category[]) => {
    setConfig((prev) => ({ ...prev, categories }));
    (async () => {
      if (!isFirebaseConfigured || !db) return;
      try {
        await setDoc(doc(db, 'siteConfig', 'content'), { categories, updatedAt: serverTimestamp() }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'siteConfig/content');
      }
    })();
  }, []);

  const updateEvolutionNote = useCallback((note: string) => {
    setConfig((prev) => ({ ...prev, evolutionNote: note }));
    (async () => {
      if (!isFirebaseConfigured || !db) return;
      try {
        await setDoc(doc(db, 'siteConfig', 'content'), { evolutionNote: note, updatedAt: serverTimestamp() }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'siteConfig/content');
      }
    })();
  }, []);

  const addCategory = useCallback((category: Category) => {
    setConfig((prev) => {
      const nextCategories = [...prev.categories, { ...category, isActive: true }];
      const nextGroups =
        category.group === '2'
          ? prev.categoryGroups.map((g) =>
              g.id === '2'
                ? {
                    ...g,
                    featuredSubcategoryIds: [...(g.featuredSubcategoryIds || []), category.id],
                  }
                : g
            )
          : prev.categoryGroups;
      const next = { ...prev, categories: nextCategories, categoryGroups: nextGroups };

      // Persist new category set
      (async () => {
        if (!isFirebaseConfigured || !db) return;
        try {
          await setDoc(doc(db, 'siteConfig', 'content'), { categories: next.categories, categoryGroups: next.categoryGroups, updatedAt: serverTimestamp() }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'siteConfig/content');
        }
      })();

      return next;
    });
  }, []);

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    setConfig((prev) => {
      const next = {
        ...prev,
        categories: prev.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      };
      (async () => {
        if (!isFirebaseConfigured || !db) return;
        try {
          await setDoc(doc(db, 'siteConfig', 'content'), { categories: next.categories, updatedAt: serverTimestamp() }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'siteConfig/content');
        }
      })();
      return next;
    });
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setConfig((prev) => {
      const next = { ...prev, categories: prev.categories.filter((c) => c.id !== id) };
      (async () => {
        if (!isFirebaseConfigured || !db) return;
        try {
          await setDoc(doc(db, 'siteConfig', 'content'), { categories: next.categories, updatedAt: serverTimestamp() }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'siteConfig/content');
        }
      })();
      return next;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setConfig(defaultConfig);
  }, []);

  const activeCategories = config.categories.filter((c) => c.isActive !== false);

  return {
    categoryGroups: config.categoryGroups,
    categories: config.categories,
    activeCategories,
    evolutionNote: config.evolutionNote,
    updateCategoryGroups,
    updateCategories,
    updateEvolutionNote,
    addCategory,
    updateCategory,
    deleteCategory,
    resetToDefaults,
  };
}
