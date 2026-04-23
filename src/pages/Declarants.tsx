import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Plus, Building2, FileText, Hash, Save, Trash2, Eye, CheckCircle2, XCircle
} from 'lucide-react';

interface Declarant {
  id: string;
  raison_sociale: string;
  sigle: string | null;
  nif: string | null;
  rccm: string | null;
  nic: string | null;
  dgi_numero: string | null;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  banque: string | null;
  compte_bancaire: string | null;
  periodicite: string;
  arrondissement: string | null;
  centre_impot: string | null;
  actif: boolean;
  created_at: string;
}

interface DgiDeclaration {
  id: string;
  declarant_id: string;
  mois: number;
  annee: number;
  nombre_factures: number;
  total_htva: number;
  total_tva: number;
  total_ttc: number;
  statut: string;
  date_soumission: string | null;
  reference_dgi: string | null;
}

const defaultForm: Partial<Declarant> = {
  raison_sociale: '',
  sigle: '',
  nif: '',
  rccm: '',
  nic: '',
  dgi_numero: '',
  adresse: '',
  telephone: '',
  email: '',
  banque: '',
  compte_bancaire: '',
  periodicite: 'mensuelle',
  arrondissement: '',
  centre_impot: '',
  actif: true,
};

const Declarants = () => {
  const [declarants, setDeclarants] = useState<Declarant[]>([]);
  const [declarations, setDeclarations] = useState<DgiDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Declarant>>(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [declRes, declaRes] = await Promise.all([
      supabase.from('declarants').select('*').order('created_at', { ascending: false }),
      supabase.from('dgi_declarations').select('*').order('annee', { ascending: false }).order('mois', { ascending: false }),
    ]);
    setDeclarants(declRes.data || []);
    setDeclarations(declaRes.data || []);
    setLoading(false);
  };

  const openNew = () => {
    setForm(defaultForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (d: Declarant) => {
    setForm({ ...d });
    setEditingId(d.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      ...form,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    };
    if (editingId) {
      await supabase.from('declarants').update(payload).eq('id', editingId);
    } else {
      await supabase.from('declarants').insert(payload);
    }
    setSaving(false);
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce déclarant ?')) return;
    await supabase.from('declarants').delete().eq('id', id);
    fetchData();
  };

  const getStatutBadge = (statut: string) => {
    const map: Record<string, { label: string; color: string }> = {
      brouillon: { label: 'Brouillon', color: 'bg-gray-500' },
      soumise: { label: 'Soumise', color: 'bg-yellow-500' },
      validee: { label: 'Validée', color: 'bg-green-500' },
      rejetee: { label: 'Rejetée', color: 'bg-red-500' },
    };
    const s = map[statut] || { label: statut, color: 'bg-gray-400' };
    return <Badge className={`${s.color} text-white text-xs`}>{s.label}</Badge>;
  };

  const moisNoms = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="w-8 h-8" />
            Déclarants DGI
          </h1>
          <p className="text-muted-foreground">Gestion des déclarations fiscales DGI RDC</p>
        </div>
        <Button onClick={openNew} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Déclarant
        </Button>
      </div>

      <Tabs defaultValue="declarants">
        <TabsList>
          <TabsTrigger value="declarants">Déclarants</TabsTrigger>
          <TabsTrigger value="declarations">Déclarations</TabsTrigger>
        </TabsList>

        <TabsContent value="declarants" className="space-y-4">
          {loading ? (
            <p className="text-muted-foreground p-4">Chargement...</p>
          ) : declarants.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun déclarant enregistré.</p>
                <Button onClick={openNew} className="mt-4 bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un déclarant
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {declarants.map((d) => (
                <Card key={d.id} className={!d.actif ? 'opacity-60' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{d.raison_sociale}</CardTitle>
                        {d.sigle && <p className="text-sm text-muted-foreground">Sigle: {d.sigle}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(d)}>
                          Modifier
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(d.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">NIF</p>
                        <p className="font-mono font-medium">{d.nif || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">RCCM</p>
                        <p className="font-mono font-medium">{d.rccm || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">N° DGI</p>
                        <p className="font-mono font-medium">{d.dgi_numero || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Périodicité</p>
                        <p className="font-medium capitalize">{d.periodicite}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Téléphone</p>
                        <p>{d.telephone || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p>{d.email || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Centre Impôt</p>
                        <p>{d.centre_impot || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Statut</p>
                        <Badge variant={d.actif ? 'default' : 'secondary'}>
                          {d.actif ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="declarations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Historique des Déclarations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground p-4">Chargement...</p>
              ) : declarations.length === 0 ? (
                <p className="text-muted-foreground text-center p-8">
                  Aucune déclaration enregistrée.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Période</TableHead>
                      <TableHead>Déclarant</TableHead>
                      <TableHead>Factures</TableHead>
                      <TableHead>Total HTVA</TableHead>
                      <TableHead>TVA</TableHead>
                      <TableHead>Total TTC</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Référence DGI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {declarations.map((decl) => {
                      const declarant = declarants.find((x) => x.id === decl.declarant_id);
                      return (
                        <TableRow key={decl.id}>
                          <TableCell className="font-medium">
                            {moisNoms[decl.mois]} {decl.annee}
                          </TableCell>
                          <TableCell>{declarant?.raison_sociale || '-'}</TableCell>
                          <TableCell>{decl.nombre_factures}</TableCell>
                          <TableCell className="font-mono">{decl.total_htva.toFixed(2)} USD</TableCell>
                          <TableCell className="font-mono">{decl.total_tva.toFixed(2)} USD</TableCell>
                          <TableCell className="font-mono font-bold">{decl.total_ttc.toFixed(2)} USD</TableCell>
                          <TableCell>{getStatutBadge(decl.statut)}</TableCell>
                          <TableCell className="font-mono text-sm">{decl.reference_dgi || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Form */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Modifier le Déclarant' : 'Nouveau Déclarant'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <Label>Raison Sociale *</Label>
              <Input value={form.raison_sociale || ''} onChange={(e) => setForm({ ...form, raison_sociale: e.target.value })} placeholder="Nom légal de l'entreprise" />
            </div>
            <div>
              <Label>Sigle</Label>
              <Input value={form.sigle || ''} onChange={(e) => setForm({ ...form, sigle: e.target.value })} placeholder="Ex: SOC" />
            </div>
            <div>
              <Label>NIF</Label>
              <Input value={form.nif || ''} onChange={(e) => setForm({ ...form, nif: e.target.value })} placeholder="Numéro d'Identification Fiscale" />
            </div>
            <div>
              <Label>RCCM</Label>
              <Input value={form.rccm || ''} onChange={(e) => setForm({ ...form, rccm: e.target.value })} placeholder="Registre du Commerce" />
            </div>
            <div>
              <Label>NIC</Label>
              <Input value={form.nic || ''} onChange={(e) => setForm({ ...form, nic: e.target.value })} placeholder="Numéro Identification Contribuable" />
            </div>
            <div>
              <Label>N° DGI</Label>
              <Input value={form.dgi_numero || ''} onChange={(e) => setForm({ ...form, dgi_numero: e.target.value })} placeholder="Numéro DGI officiel" />
            </div>
            <div>
              <Label>Périodicité</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.periodicite || 'mensuelle'}
                onChange={(e) => setForm({ ...form, periodicite: e.target.value })}
              >
                <option value="mensuelle">Mensuelle</option>
                <option value="trimestrielle">Trimestrielle</option>
                <option value="annuelle">Annuelle</option>
              </select>
            </div>
            <div className="col-span-2">
              <Label>Adresse</Label>
              <Input value={form.adresse || ''} onChange={(e) => setForm({ ...form, adresse: e.target.value })} placeholder="Adresse complète" />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input value={form.telephone || ''} onChange={(e) => setForm({ ...form, telephone: e.target.value })} placeholder="+243 XX XXX XXXX" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contact@entreprise.cd" />
            </div>
            <div>
              <Label>Banque</Label>
              <Input value={form.banque || ''} onChange={(e) => setForm({ ...form, banque: e.target.value })} placeholder="Nom de la banque" />
            </div>
            <div>
              <Label>Compte Bancaire</Label>
              <Input value={form.compte_bancaire || ''} onChange={(e) => setForm({ ...form, compte_bancaire: e.target.value })} placeholder="Numéro de compte" />
            </div>
            <div>
              <Label>Arrondissement</Label>
              <Input value={form.arrondissement || ''} onChange={(e) => setForm({ ...form, arrondissement: e.target.value })} />
            </div>
            <div>
              <Label>Centre Impôt</Label>
              <Input value={form.centre_impot || ''} onChange={(e) => setForm({ ...form, centre_impot: e.target.value })} placeholder="Centre fiscal de rattachement" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !form.raison_sociale} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Declarants;
