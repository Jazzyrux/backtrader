import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { strategyService } from '@/services/strategyService';
import type { Strategy, StrategyFile } from '@/types/trading';

interface StrategyImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (strategy: Strategy) => void;
}

export const StrategyImportDialog: React.FC<StrategyImportDialogProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState<StrategyFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<StrategyFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tvUrl, setTvUrl] = useState('');
  const [pinescriptCode, setPinescriptCode] = useState('');
  const [importType, setImportType] = useState<'file' | 'tradingview' | 'pinescript'>('file');

  useEffect(() => {
    if (isOpen) {
      loadFiles();
    }
  }, [isOpen]);

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      if (searchQuery) {
        searchFiles();
      } else {
        loadFiles();
      }
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [searchQuery]);

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      const files = await strategyService.getStrategyFiles();
      setFiles(files);
    } catch (error) {
      setError('Erreur lors du chargement des fichiers');
    } finally {
      setIsLoading(false);
    }
  };

  const searchFiles = async () => {
    try {
      setIsLoading(true);
      const results = await strategyService.searchStrategies(searchQuery);
      setFiles(results);
    } catch (error) {
      setError('Erreur lors de la recherche');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let strategy: Strategy;

      switch (importType) {
        case 'file':
          if (!selectedFile) throw new Error('Aucun fichier sélectionné');
          strategy = await strategyService.createStrategy({
            name: selectedFile.name,
            content: selectedFile.content,
            type: selectedFile.type
          });
          break;

        case 'tradingview':
          if (!tvUrl) throw new Error('URL TradingView invalide');
          strategy = await strategyService.importFromTradingView(tvUrl);
          break;

        case 'pinescript':
          if (!pinescriptCode) throw new Error('Code Pinescript invalide');
          strategy = await strategyService.importPinescript(pinescriptCode);
          break;

        default:
          throw new Error('Type d\'importation invalide');
      }

      onImport(strategy);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors de l\'importation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Importer une Stratégie"
      className="w-full max-w-2xl"
    >
      <div className="space-y-4">
        {error && (
          <Alert variant="error">
            {error}
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            variant={importType === 'file' ? 'default' : 'outline'}
            onClick={() => setImportType('file')}
          >
            Fichier Local
          </Button>
          <Button
            variant={importType === 'tradingview' ? 'default' : 'outline'}
            onClick={() => setImportType('tradingview')}
          >
            TradingView
          </Button>
          <Button
            variant={importType === 'pinescript' ? 'default' : 'outline'}
            onClick={() => setImportType('pinescript')}
          >
            Pinescript
          </Button>
        </div>

        {importType === 'file' && (
          <>
            <Input
              type="text"
              placeholder="Rechercher une stratégie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4"
            />

            <div className="max-h-96 overflow-y-auto space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedFile?.id === file.id
                      ? 'bg-blue-500/20 border border-blue-500'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                  onClick={() => setSelectedFile(file)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{file.name}</h4>
                      <p className="text-sm text-gray-400">
                        Modifié le {new Date(file.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs rounded bg-gray-700">
                      {file.type}
                    </span>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="text-center py-4 text-gray-400">
                  Chargement...
                </div>
              )}
            </div>
          </>
        )}

        {importType === 'tradingview' && (
          <div>
            <Input
              type="text"
              placeholder="URL de la stratégie TradingView"
              value={tvUrl}
              onChange={(e) => setTvUrl(e.target.value)}
            />
            <p className="text-sm text-gray-400 mt-1">
              Collez l'URL d'une stratégie publique depuis TradingView.com
            </p>
          </div>
        )}

        {importType === 'pinescript' && (
          <div>
            <textarea
              value={pinescriptCode}
              onChange={(e) => setPinescriptCode(e.target.value)}
              placeholder="Collez votre code Pinescript ici..."
              className="w-full h-48 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleImport}
            disabled={isLoading || (
              (importType === 'file' && !selectedFile) ||
              (importType === 'tradingview' && !tvUrl) ||
              (importType === 'pinescript' && !pinescriptCode)
            )}
          >
            {isLoading ? 'Importation...' : 'Importer'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}; 