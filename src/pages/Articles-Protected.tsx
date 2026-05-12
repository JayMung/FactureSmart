"use client";

import { useState } from 'react';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Barcode,
  Package,
  AlertTriangle,
  Loader2,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { showSuccess, showError } from '@/utils/toast';
import { useArticles } from '@/hooks/useArticles';
import { ArticleFormModal } from '@/components/articles/ArticleFormModal';
import type { Article, CreateArticleData, UpdateArticleData } from '@/types';

const TVA_LABELS: Record<string, string> = {
  A: '0%',
  B: '16%',
  C: '0%',
};

const TVA_BADGE_VARIANTS: Record<string, 'secondary' | 'default' | 'outline'> = {
  A: 'secondary',
  B: 'default',
  C: 'outline',
};

export default function ArticlesProtected() {
  const [search, setSearch] = useState('');
  const [filterTva, setFilterTva] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);

  const {
    articles,
    loading,
    count,
    createArticle,
    updateArticle,
    deleteArticle,
    refetch,
  } = useArticles({
    search: search || undefined,
    groupe_tva: filterTva !== 'all' ? (filterTva as 'A' | 'B' | 'C') : undefined,
  });

  const handleCreate = async (data: CreateArticleData) => {
    const result = await createArticle(data);
    if (result) {
      showSuccess('Article créé avec succès');
      return true;
    }
    showError("Erreur lors de la création de l'article");
    return false;
  };

  const handleUpdate = async (data: UpdateArticleData) => {
    if (!editingArticle) return false;
    const result = await updateArticle(editingArticle.id, data);
    if (result) {
      showSuccess('Article mis à jour');
      return true;
    }
    showError("Erreur lors de la mise à jour de l'article");
    return false;
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const success = await deleteArticle(deleteTarget.id);
    if (success) {
      showSuccess('Article supprimé');
    } else {
      showError("Erreur lors de la suppression de l'article");
    }
    setDeleteTarget(null);
  };

  const openEdit = (article: Article) => {
    setEditingArticle(article);
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditingArticle(null);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Articles</h1>
          <p className="text-muted-foreground">
            Gérez votre catalogue d'articles et produits
            {count > 0 && (
              <span className="ml-1">— {count} article{count > 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvel article
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou code-barres..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterTva} onValueChange={setFilterTva}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Groupe TVA" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les groupes</SelectItem>
            <SelectItem value="A">Groupe A (0%)</SelectItem>
            <SelectItem value="B">Groupe B (16%)</SelectItem>
            <SelectItem value="C">Groupe C (0%)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium mb-1">Aucun article</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                {search
                  ? 'Aucun article ne correspond à votre recherche'
                  : 'Commencez par ajouter votre premier article au catalogue'}
              </p>
              {!search && (
                <Button onClick={openCreate} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un article
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dénomination</TableHead>
                  <TableHead>Code-barres</TableHead>
                  <TableHead className="text-right">Prix unitaire</TableHead>
                  <TableHead>TVA</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium">{article.denomination}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {article.code_barres ? (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Barcode className="h-3 w-3" />
                          <code className="text-xs">{article.code_barres}</code>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {article.prix.toLocaleString('fr-FR', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      <span className="text-xs text-muted-foreground">USD</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={TVA_BADGE_VARIANTS[article.groupe_tva]}>
                        Groupe {article.groupe_tva} ({TVA_LABELS[article.groupe_tva]})
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(article)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(article)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <ArticleFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingArticle(null);
        }}
        onSubmit={editingArticle ? handleUpdate : handleCreate}
        article={editingArticle}
        title={editingArticle ? 'Modifier l\'article' : 'Nouvel article'}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmer la suppression
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer{' '}
              <strong>{deleteTarget?.denomination}</strong> ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
