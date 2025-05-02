import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { Strategy } from '../types/trading';

const router = express.Router();
const STRATEGIES_DIR = path.join(__dirname, '../../strategies');

// Assurer que le dossier strategies existe
async function ensureStrategiesDir() {
  try {
    await fs.mkdir(STRATEGIES_DIR, { recursive: true });
  } catch (error) {
    console.error('Erreur lors de la création du dossier strategies:', error);
  }
}

ensureStrategiesDir();

// GET /api/strategies - Récupérer toutes les stratégies
router.get('/', async (req, res) => {
  try {
    const files = await fs.readdir(STRATEGIES_DIR);
    const strategies = await Promise.all(
      files
        .filter(file => file.endsWith('.json'))
        .map(async file => {
          const content = await fs.readFile(path.join(STRATEGIES_DIR, file), 'utf-8');
          return JSON.parse(content);
        })
    );
    res.json(strategies);
  } catch (error) {
    console.error('Erreur lors de la récupération des stratégies:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des stratégies' });
  }
});

// GET /api/strategies/files - Récupérer tous les fichiers de stratégies
router.get('/files', async (req, res) => {
  try {
    const files = await fs.readdir(STRATEGIES_DIR);
    const strategyFiles = await Promise.all(
      files.map(async file => {
        const stats = await fs.stat(path.join(STRATEGIES_DIR, file));
        return {
          id: path.parse(file).name,
          name: path.parse(file).name,
          content: await fs.readFile(path.join(STRATEGIES_DIR, file), 'utf-8'),
          type: file.endsWith('.ts') ? 'typescript' : 'pinescript',
          createdAt: stats.birthtime.toISOString(),
          updatedAt: stats.mtime.toISOString()
        };
      })
    );
    res.json(strategyFiles);
  } catch (error) {
    console.error('Erreur lors de la récupération des fichiers:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des fichiers' });
  }
});

// POST /api/strategies/files - Créer une nouvelle stratégie
router.post('/files', async (req, res) => {
  try {
    const { name, content, type } = req.body;
    const fileName = `${name}.${type === 'typescript' ? 'json' : 'pine'}`;
    const filePath = path.join(STRATEGIES_DIR, fileName);

    // Vérifier si le fichier existe déjà
    try {
      await fs.access(filePath);
      return res.status(400).json({ error: 'Une stratégie avec ce nom existe déjà' });
    } catch {
      // Le fichier n'existe pas, on peut continuer
    }

    // Sauvegarder la stratégie
    await fs.writeFile(filePath, content);

    // Si c'est une stratégie TypeScript, la sauvegarder aussi en JSON
    if (type === 'typescript') {
      const strategy: Strategy = JSON.parse(content);
      await fs.writeFile(
        path.join(STRATEGIES_DIR, `${name}.json`),
        JSON.stringify(strategy, null, 2)
      );
    }

    res.json({
      id: name,
      name,
      content,
      type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erreur lors de la création de la stratégie:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la stratégie' });
  }
});

// PUT /api/strategies/files/:id - Mettre à jour une stratégie
router.put('/files/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, content, type } = req.body;
    const fileName = `${id}.${type === 'typescript' ? 'json' : 'pine'}`;
    const filePath = path.join(STRATEGIES_DIR, fileName);

    // Vérifier si le fichier existe
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'Stratégie non trouvée' });
    }

    // Mettre à jour la stratégie
    await fs.writeFile(filePath, content);

    // Si c'est une stratégie TypeScript, la sauvegarder aussi en JSON
    if (type === 'typescript') {
      const strategy: Strategy = JSON.parse(content);
      await fs.writeFile(
        path.join(STRATEGIES_DIR, `${id}.json`),
        JSON.stringify(strategy, null, 2)
      );
    }

    res.json({
      id,
      name: name || id,
      content,
      type,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la stratégie:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la stratégie' });
  }
});

// DELETE /api/strategies/files/:id - Supprimer une stratégie
router.delete('/files/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tsPath = path.join(STRATEGIES_DIR, `${id}.ts`);
    const jsonPath = path.join(STRATEGIES_DIR, `${id}.json`);
    const pinePath = path.join(STRATEGIES_DIR, `${id}.pine`);

    // Supprimer tous les fichiers associés
    try {
      await fs.unlink(tsPath);
    } catch {}
    try {
      await fs.unlink(jsonPath);
    } catch {}
    try {
      await fs.unlink(pinePath);
    } catch {}

    res.status(204).send();
  } catch (error) {
    console.error('Erreur lors de la suppression de la stratégie:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la stratégie' });
  }
});

// GET /api/strategies/search - Rechercher des stratégies
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    const files = await fs.readdir(STRATEGIES_DIR);
    const strategyFiles = await Promise.all(
      files
        .filter(file => {
          const name = path.parse(file).name.toLowerCase();
          return name.includes((q as string).toLowerCase());
        })
        .map(async file => {
          const stats = await fs.stat(path.join(STRATEGIES_DIR, file));
          return {
            id: path.parse(file).name,
            name: path.parse(file).name,
            content: await fs.readFile(path.join(STRATEGIES_DIR, file), 'utf-8'),
            type: file.endsWith('.ts') ? 'typescript' : 'pinescript',
            createdAt: stats.birthtime.toISOString(),
            updatedAt: stats.mtime.toISOString()
          };
        })
    );
    res.json(strategyFiles);
  } catch (error) {
    console.error('Erreur lors de la recherche de stratégies:', error);
    res.status(500).json({ error: 'Erreur lors de la recherche de stratégies' });
  }
});

// GET /api/strategies/import/tradingview/:id - Importer une stratégie depuis TradingView
router.get('/import/tradingview/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Implémenter la récupération depuis TradingView
    // Pour l'instant, on renvoie un exemple de code Pinescript
    const pinescriptCode = `
      // @name Example Strategy
      // @description Une stratégie d'exemple
      
      //@version=5
      strategy("Example Strategy", overlay=true)
      
      // Paramètres
      fastLength = input(9, "Fast Length")
      slowLength = input(21, "Slow Length")
      
      // Calcul des moyennes mobiles
      fastMA = sma(close, fastLength)
      slowMA = sma(close, slowLength)
      
      // Conditions de trading
      longCondition = crossover(fastMA, slowMA)
      shortCondition = crossunder(fastMA, slowMA)
      
      // Exécution des ordres
      if (longCondition)
        strategy.entry("Long", strategy.long)
      
      if (shortCondition)
        strategy.close("Long")
    `;

    res.json({ pinescriptCode });
  } catch (error) {
    console.error('Erreur lors de l\'importation depuis TradingView:', error);
    res.status(500).json({ error: 'Erreur lors de l\'importation depuis TradingView' });
  }
});

export default router; 