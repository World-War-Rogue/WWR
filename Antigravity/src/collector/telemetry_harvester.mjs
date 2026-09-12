import fs from 'fs';
import path from 'path';
import { CodebaseScanner } from './codebase_scanner.mjs';
import { GameDataParser } from './game_data_parser.mjs';

/**
 * Orchestrates data harvesting across source code, game tables, and dossiers.
 */
export class TelemetryHarvester {
  constructor(config) {
    this.config = config;
    this.scanner = new CodebaseScanner(config.targetGamePath);
    this.parser = new GameDataParser(config.targetGamePath);
  }

  /**
   * Harvests full dataset from the target game repository.
   */
  async harvestAll() {
    const scanStats = await this.scanner.scanCodebase();
    const units = await this.parser.parseUnits();
    const initialState = await this.parser.parseInitialState();
    const dossiers = await this.parser.parseDossiers();

    // Analyze individual React components
    const componentMetrics = [];
    if (scanStats.files && scanStats.files.components) {
      for (const compPath of scanStats.files.components) {
        const metrics = await this.scanner.analyzeComponent(compPath);
        componentMetrics.push(metrics);
      }
    }

    const harvestPackage = {
      timestamp: new Date().toISOString(),
      gamePath: this.config.targetGamePath,
      overview: {
        totalFiles: scanStats.totalFiles,
        componentsCount: componentMetrics.length,
        unitsCount: units.length,
        squadsCount: (initialState.squads || []).length,
        buildingsCount: (initialState.buildings || []).length,
        dossiersCount: dossiers.length
      },
      units,
      squads: initialState.squads || [],
      buildings: initialState.buildings || [],
      dossiers,
      components: componentMetrics
    };

    return harvestPackage;
  }

  /**
   * Persists harvested telemetry package to JSON.
   */
  async saveTelemetry(data, outputFilePath) {
    const dir = path.dirname(outputFilePath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    await fs.promises.writeFile(outputFilePath, JSON.stringify(data, null, 2), 'utf8');
  }
}
