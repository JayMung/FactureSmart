import { ArrowLeft, Clock, Trash2 } from 'lucide-react';
import Button from '@/components/ui/button';
import { showSuccess } from '@/utils/toast';

interface FactureFormHeaderProps {
  title: string;
  subtitle: string;
  isEditMode: boolean;
  hasSavedData: () => boolean;
  clearSavedData: () => void;
  onBack: () => void;
}

export function FactureFormHeader({
  title,
  subtitle,
  isEditMode,
  hasSavedData,
  clearSavedData,
  onBack,
}: FactureFormHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour
      </Button>
      <div className="text-center flex-1">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-500">{subtitle}</p>
        {!isEditMode && (
          <div className="flex items-center justify-center mt-2 text-sm text-green-600">
            <Clock className="mr-1 h-3 w-3" />
            Sauvegarde automatique activée
          </div>
        )}
      </div>
      <div className="w-24 flex justify-end">
        {!isEditMode && hasSavedData() && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearSavedData();
              showSuccess('Brouillon supprimé');
            }}
            className="text-gray-500 hover:text-red-600"
            title="Supprimer le brouillon"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
