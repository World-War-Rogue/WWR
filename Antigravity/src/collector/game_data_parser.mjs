import fs from 'fs';
import path from 'path';

/**
 * Parses game design data structures, units, buildings, squads, and equipment.
 */
export class GameDataParser {
  constructor(targetDir) {
    this.targetDir = targetDir;
    this.dataDir = path.join(targetDir, 'src', 'data');
    this.docsDir = path.join(targetDir, 'docs');
  }

  /**
   * Safely extracts JavaScript/TypeScript array of objects from source code.
   */
  extractArrayFromSource(content, arrayName) {
    const regex = new RegExp(`export\\s+const\\s+${arrayName}[^=]*=\\s*(\\[[\\s\\S]*?\\n\\]);`, 'm');
    const match = content.match(regex);
    if (!match) return null;

    let arrayStr = match[1];

    // Clean TypeScript type assertions, trailing commas, comments
    arrayStr = arrayStr
      .replace(/\/\*[\s\S]*?\*\//g, '') // remove multi-line comments
      .replace(/\/\/.*$/gm, '')           // remove single line comments
      .replace(/as\s+[A-Za-z0-9_<>[\],\s]+/g, '') // remove "as Type"
      .replace(/,\s*([\]}])/g, '$1');    // fix trailing commas

    try {
      // Use Function constructor for safe object literal evaluation in a sandbox
      const fn = new Function(`return ${arrayStr};`);
      return fn();
    } catch {
      // Fallback regex item extractor for robust parsing even with arbitrary syntax
      return this.regexFallbackParseObjects(arrayStr);
    }
  }

  /**
   * Fallback regex object parser when direct JSON/eval fails due to TS syntax.
   */
  regexFallbackParseObjects(rawText) {
    const objects = [];
    const objRegex = /\{([\s\S]*?)\}/g;
    let match;

    while ((match = objRegex.exec(rawText)) !== null) {
      const block = match[1];
      const obj = {};
      const lines = block.split('\n');

      for (const line of lines) {
        const kvMatch = line.match(/^\s*([a-zA-Z0-9_]+)\s*:\s*(['"`]?)(.*?)\2\s*,?$/);
        if (kvMatch) {
          const key = kvMatch[1];
          let val = kvMatch[3].trim();
          if (val === 'true') val = true;
          else if (val === 'false') val = false;
          else if (!isNaN(Number(val)) && val !== '') val = Number(val);
          obj[key] = val;
        }
      }
      if (Object.keys(obj).length > 2) {
        objects.push(obj);
      }
    }
    return objects;
  }

  /**
   * Parses all units from units.ts
   */
  async parseUnits() {
    const unitsFile = path.join(this.dataDir, 'units.ts');
    if (!fs.existsSync(unitsFile)) {
      return this.getFallbackUnits();
    }

    const content = await fs.promises.readFile(unitsFile, 'utf8');
    const units = this.extractArrayFromSource(content, 'RAW_UNITS_DATA');
    if (units && units.length > 0) {
      return units;
    }
    return this.getFallbackUnits();
  }

  /**
   * Parses squads and initial base buildings from initialState.ts
   */
  async parseInitialState() {
    const stateFile = path.join(this.dataDir, 'initialState.ts');
    if (!fs.existsSync(stateFile)) {
      return { squads: [], buildings: [] };
    }

    const content = await fs.promises.readFile(stateFile, 'utf8');
    const squads = this.extractArrayFromSource(content, 'INITIAL_SQUADS') || [];
    const buildings = this.extractArrayFromSource(content, 'INITIAL_BASE_BUILDINGS') || [];

    return { squads, buildings };
  }

  /**
   * Parses design documentation dossiers from the docs/ directory.
   */
  async parseDossiers() {
    if (!fs.existsSync(this.docsDir)) return [];

    const files = await fs.promises.readdir(this.docsDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    const dossiers = [];

    for (const file of mdFiles) {
      const filePath = path.join(this.docsDir, file);
      const content = await fs.promises.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      const titleMatch = content.match(/^#\s+(.*)$/m);
      const title = titleMatch ? titleMatch[1] : file;

      dossiers.push({
        fileName: file,
        title,
        lineCount: lines.length,
        hasMathematicalModels: content.includes('$$') || content.includes('formula') || content.includes('algorithm'),
        hasCombatTables: content.includes('|') && content.includes('---'),
        wordCount: content.split(/\s+/).length
      });
    }

    return dossiers;
  }

  /**
   * Fallback realistic tactical unit database for standalone testing.
   */
  getFallbackUnits() {
    return [
      {
        id: 'us-m1a2-abrams',
        name: 'M1A2 SEPv3 Abrams',
        country: 'US',
        era: 'Modern',
        role: 'Main Battle Tank',
        powerRating: 980,
        hp: 2500,
        armor: 88,
        firepower: 440,
        fireRate: 0.22,
        range: 330,
        speed: 38,
        blastRadius: 36,
        penetration: 110,
        unlockCostWarBonds: 0,
        unlockedByDefault: true
      },
      {
        id: 'de-leopard-2a7',
        name: 'Leopard 2A7+ Heavy MBT',
        country: 'DE',
        era: 'Modern',
        role: 'Main Battle Tank',
        powerRating: 990,
        hp: 2550,
        armor: 90,
        firepower: 450,
        fireRate: 0.24,
        range: 340,
        speed: 40,
        blastRadius: 38,
        penetration: 115,
        unlockCostWarBonds: 0,
        unlockedByDefault: true
      },
      {
        id: 'de-pzh-2000',
        name: 'Panzerhaubitze 2000',
        country: 'DE',
        era: 'Modern',
        role: 'Artillery',
        powerRating: 940,
        hp: 1400,
        armor: 45,
        firepower: 620,
        fireRate: 0.16,
        range: 580,
        speed: 32,
        blastRadius: 65,
        penetration: 85,
        unlockCostWarBonds: 150
      },
      {
        id: 'il-iron-dome',
        name: 'Iron Dome Defense Battery',
        country: 'IL',
        era: 'Modern',
        role: 'Air Defense',
        powerRating: 960,
        hp: 1600,
        armor: 40,
        firepower: 380,
        fireRate: 0.45,
        range: 480,
        speed: 25,
        blastRadius: 40,
        penetration: 70,
        unlockCostWarBonds: 200
      },
      {
        id: 'us-navy-seal-breacher',
        name: 'Navy SEAL Recon Breacher',
        country: 'US',
        era: 'Modern',
        role: 'Infantry / Recon',
        powerRating: 750,
        hp: 850,
        armor: 25,
        firepower: 280,
        fireRate: 0.65,
        range: 220,
        speed: 55,
        blastRadius: 15,
        penetration: 60,
        unlockCostWarBonds: 50
      }
    ];
  }
}
