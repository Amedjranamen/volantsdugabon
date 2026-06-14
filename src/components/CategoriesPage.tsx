import React from 'react';
import { ChevronRight, Trophy, Car, Building2, Sparkles, Users } from 'lucide-react';
import { Category, CategoryGroup, Candidate } from '../types';
import librevilleTaxi from '../assets/images/libreville_taxi_1780991225926.png';

const GROUP_IMAGES: Record<string, string> = {
  '1': librevilleTaxi,
};

const GROUP_GRADIENTS: Record<string, string> = {
  '2': 'from-blue-900 via-slate-800 to-slate-900',
  '3': 'from-slate-800 via-zinc-800 to-slate-900',
  '4': 'from-amber-900 via-red-900 to-slate-900',
};

const GROUP_ICONS: Record<string, React.ReactNode> = {
  '2': <Car className="h-16 w-16 text-white/30" />,
  '3': <Building2 className="h-16 w-16 text-white/30" />,
  '4': <Trophy className="h-16 w-16 text-amber-400/40" />,
};

interface CategoriesPageProps {
  categoryGroups: CategoryGroup[];
  categories: Category[];
  candidates: Candidate[];
  evolutionNote: string;
  onNavigateToVote: (categoryId: string) => void;
}

function CategoryImage({ group }: { group: CategoryGroup }) {
  const src = group.imageUrl || GROUP_IMAGES[group.id];

  if (src) {
    return (
      <div className="relative h-48 sm:h-56 md:h-64 rounded-2xl overflow-hidden shadow-lg">
        <img src={src} alt={group.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />
      </div>
    );
  }

  const gradient = GROUP_GRADIENTS[group.id] || 'from-red-900 via-slate-900 to-slate-950';
  return (
    <div className={`relative h-48 sm:h-56 md:h-64 rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
      {GROUP_ICONS[group.id] || <Sparkles className="h-16 w-16 text-white/20" />}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
    </div>
  );
}

function VotePreview({ categoryId, candidates }: { categoryId: string; candidates: Candidate[] }) {
  const catCandidates = candidates.filter((c) => c.categoryId === categoryId);
  if (catCandidates.length === 0) {
    return (
      <p className="font-montserrat text-xs text-slate-400 italic py-3">
        Candidats à venir — inscrivez-vous ou revenez bientôt.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2 py-2">
      {catCandidates.slice(0, 3).map((c) => (
        <span
          key={c.id}
          className="font-montserrat text-[10px] font-semibold bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-full"
        >
          {c.prenom} {c.nom}
        </span>
      ))}
      {catCandidates.length > 3 && (
        <span className="font-montserrat text-[10px] text-custom-accent font-bold self-center">
          +{catCandidates.length - 3} autres
        </span>
      )}
    </div>
  );
}

function VoteButton({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer group inline-flex items-center space-x-2 bg-custom-accent hover:bg-red-700 text-white font-montserrat text-xs sm:text-sm font-bold px-5 py-3 rounded-xl transition-all shadow-md hover:shadow-lg ${className}`}
    >
      <span>Voir les candidats et voter</span>
      <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
    </button>
  );
}

export default function CategoriesPage({
  categoryGroups,
  categories,
  candidates,
  evolutionNote,
  onNavigateToVote,
}: CategoriesPageProps) {
  const activeCategories = categories.filter((c) => c.isActive !== false);

  return (
    <div className="item-fade-in mx-auto max-w-5xl px-4 py-12">
      {/* En-tête */}
      <div className="text-center mb-14">
        <span className="font-montserrat text-[10px] text-custom-accent font-bold tracking-widest uppercase block mb-3">
          PRÉSENTATION DES CATÉGORIES
        </span>
        <h2 className="font-essentials text-3xl sm:text-4xl md:text-5xl text-slate-900 leading-none mb-4">
          LES AWARDS
        </h2>
        <p className="font-montserrat text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
          22 trophées. 4 catégories. Des centaines de candidats. Un seul vote : le vôtre.
        </p>
      </div>

      {/* Sections catégories */}
      <div className="space-y-16">
        {categoryGroups.map((group) => {
          const groupCategories = activeCategories.filter((c) => c.group === group.id);
          const featuredIds = group.featuredSubcategoryIds ?? [];
          const voteBlocks = group.subcategoryVoteBlocks
            ? featuredIds
                .map((id) => groupCategories.find((c) => c.id === id))
                .filter(Boolean) as Category[]
            : [];

          return (
            <section key={group.id} className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center text-custom-accent shrink-0">
                  <Trophy className="h-5 w-5" />
                </div>
                <h3 className="font-essentials text-lg sm:text-xl text-slate-900 leading-tight">
                  {group.title}
                </h3>
              </div>

              <CategoryImage group={group} />

              <p className="font-montserrat text-sm sm:text-base text-slate-600 leading-relaxed">
                {group.explanation}
              </p>

              {/* Catégorie 2 : blocs vote par sous-catégorie */}
              {group.subcategoryVoteBlocks && voteBlocks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {voteBlocks.map((sub) => (
                    <div
                      key={sub.id}
                      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-custom-accent/30 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <span className="font-essentials text-xs text-custom-accent shrink-0 mt-0.5">
                          {sub.number}
                        </span>
                        <h4 className="font-montserrat text-sm font-bold text-slate-800 leading-snug">
                          {sub.name}
                        </h4>
                      </div>
                      <VotePreview categoryId={sub.id} candidates={candidates} />
                      <VoteButton onClick={() => onNavigateToVote(sub.id)} className="mt-3 w-full justify-center" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* Liste des trophées */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {groupCategories.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3"
                      >
                        <span className="font-essentials text-[10px] text-custom-accent shrink-0">{item.number}</span>
                        <span className="font-montserrat text-xs font-semibold text-slate-700 leading-snug">
                          {item.name}
                          {item.hasStar && <span className="text-amber-500 ml-1">★</span>}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Espace vote consolidé */}
                  <div className="bg-gradient-to-br from-red-50/80 to-white border border-red-100 rounded-2xl p-6 sm:p-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="h-4 w-4 text-custom-accent" />
                      <span className="font-montserrat text-[10px] font-black text-slate-700 uppercase tracking-widest">
                        Espace de vote
                      </span>
                    </div>
                    {(() => {
                      const groupCandidateIds = groupCategories.map((gc) => gc.id);
                      const groupCandidates = candidates.filter((c) => groupCandidateIds.includes(c.categoryId));
                      if (groupCandidates.length === 0) {
                        return (
                          <p className="font-montserrat text-xs text-slate-400 italic mb-4">
                            Candidats à venir — inscrivez-vous ou revenez bientôt.
                          </p>
                        );
                      }
                      return (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {groupCandidates.slice(0, 5).map((c) => (
                            <span
                              key={c.id}
                              className="font-montserrat text-[10px] font-semibold bg-white border border-slate-200 text-slate-600 px-2.5 py-1 rounded-full"
                            >
                              {c.prenom} {c.nom}
                            </span>
                          ))}
                          {groupCandidates.length > 5 && (
                            <span className="font-montserrat text-[10px] text-custom-accent font-bold self-center">
                              +{groupCandidates.length - 5} autres
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    <p className="font-montserrat text-xs text-slate-500 mb-4">
                      {groupCategories.length} trophée{groupCategories.length > 1 ? 's' : ''} dans cette catégorie
                    </p>
                    <VoteButton
                      onClick={() => onNavigateToVote(groupCategories[0]?.id || 'ALL')}
                    />
                  </div>
                </>
              )}
            </section>
          );
        })}
      </div>

      {/* Note évolution */}
      <div className="mt-16 bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 sm:p-8">
        <p className="font-montserrat text-sm sm:text-base text-amber-950 leading-relaxed font-bold">
          {evolutionNote}
        </p>
      </div>
    </div>
  );
}
