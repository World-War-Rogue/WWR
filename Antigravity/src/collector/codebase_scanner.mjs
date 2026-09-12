import fs from 'fs';
import path from 'path';

/**
 * Scans a target codebase for source files, components, data, and documentation.
 */
export class CodebaseScanner {
  constructor(targetDir) {
    this.targetDir = targetDir;
  }

  /**
   * Recursively walks a directory and collects files matching extensions.
   */
  async walkDirectory(dir, extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css']) {
    const results = [];
    if (!fs.existsSync(dir)) return results;

    const list = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of list) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist' && entry.name !== 'build') {
          const subResults = await this.walkDirectory(fullPath, extensions);
          results.push(...subResults);
        }
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          results.push(fullPath);
        }
      }
    }
    return results;
  }

  /**
   * Performs an initial inventory of the target game codebase.
   */
  async scanCodebase() {
    const srcDir = path.join(this.targetDir, 'src');
    const docsDir = path.join(this.targetDir, 'docs');
    const componentsDir = path.join(srcDir, 'components');
    const dataDir = path.join(srcDir, 'data');

    const allFiles = await this.walkDirectory(this.targetDir);
    const componentFiles = await this.walkDirectory(componentsDir, ['.tsx', '.jsx']);
    const dataFiles = await this.walkDirectory(dataDir, ['.ts', '.js', '.json']);
    const docFiles = await this.walkDirectory(docsDir, ['.md']);

    const stats = {
      targetDir: this.targetDir,
      exists: fs.existsSync(this.targetDir),
      totalFiles: allFiles.length,
      componentCount: componentFiles.length,
      dataFilesCount: dataFiles.length,
      documentationCount: docFiles.length,
      files: {
        components: componentFiles,
        data: dataFiles,
        docs: docFiles,
        all: allFiles
      }
    };

    return stats;
  }

  /**
   * Analyzes an individual React component's code metrics and hooks.
   */
  async analyzeComponent(filePath) {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    const lineCount = lines.length;
    const name = path.basename(filePath, path.extname(filePath));

    // Hook analysis
    const useStateMatches = (content.match(/useState\s*(?:<[^>]+>)?\s*\(/g) || []).length;
    const useEffectMatches = (content.match(/useEffect\s*\(/g) || []).length;
    const useMemoMatches = (content.match(/useMemo\s*\(/g) || []).length;
    const useCallbackMatches = (content.match(/useCallback\s*\(/g) || []).length;
    const useRefMatches = (content.match(/useRef\s*(?:<[^>]+>)?\s*\(/g) || []).length;
    const customHookMatches = (content.match(/use[A-Z][a-zA-Z0-9]+\s*\(/g) || []).length -
      (useStateMatches + useEffectMatches + useMemoMatches + useCallbackMatches + useRefMatches);

    // Interactive & Visual density metrics
    const buttonCount = (content.match(/<button[\s>]/gi) || []).length;
    const inputCount = (content.match(/<input[\s>]/gi) || []).length;
    const modalCount = (content.match(/modal|dialog|overlay/gi) || []).length;
    const canvasCount = (content.match(/<canvas[\s>]/gi) || []).length;
    const svgCount = (content.match(/<svg[\s>]/gi) || []).length;

    // Tactical HUD military styling tokens
    const greenPhosphorCount = (content.match(/emerald|green|#22c55e|#10b981/gi) || []).length;
    const amberAlertCount = (content.match(/amber|yellow|#f59e0b|#eab308/gi) || []).length;
    const redDangerCount = (content.match(/rose|red|#ef4444|#dc2626/gi) || []).length;
    const scanlineCount = (content.match(/scanline|crt|flicker|hud/gi) || []).length;

    // Potential performance risks
    const unmemoizedArrayOpsInRender = (content.match(/\.(?:filter|map|sort|reduce)\s*\(/g) || []).length;
    const inlineHandlerCount = (content.match(/onClick\s*=\s*\{\s*\(\s*\)\s*=>/g) || []).length;
    const setIntervalCount = (content.match(/setInterval\s*\(/g) || []).length;
    const requestAnimationFrameCount = (content.match(/requestAnimationFrame\s*\(/g) || []).length;

    return {
      name,
      filePath,
      lineCount,
      hooks: {
        useState: useStateMatches,
        useEffect: useEffectMatches,
        useMemo: useMemoMatches,
        useCallback: useCallbackMatches,
        useRef: useRefMatches,
        totalHooks: useStateMatches + useEffectMatches + useMemoMatches + useCallbackMatches + useRefMatches + Math.max(0, customHookMatches)
      },
      density: {
        buttons: buttonCount,
        inputs: inputCount,
        modals: modalCount,
        canvases: canvasCount,
        svgs: svgCount,
        totalInteractive: buttonCount + inputCount
      },
      theme: {
        greenPhosphor: greenPhosphorCount,
        amberAlert: amberAlertCount,
        redDanger: redDangerCount,
        scanlines: scanlineCount
      },
      performanceRisks: {
        unmemoizedArrayOps: unmemoizedArrayOpsInRender,
        inlineHandlers: inlineHandlerCount,
        intervals: setIntervalCount,
        rafs: requestAnimationFrameCount
      }
    };
  }
}
