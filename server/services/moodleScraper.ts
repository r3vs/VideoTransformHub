import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import { Material } from '@shared/schema';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Interfaccia per i materiali estratti da Moodle
 */
interface ScrapedMaterial {
  title: string;
  type: string;
  content: string;
  url?: string;
  deadline?: string;
  section?: string;
}

/**
 * Analizza un corso Moodle e ne estrae i materiali didattici
 */
export async function scrapeMoodle(
  moodleUrl: string,
  username?: string,
  password?: string
): Promise<ScrapedMaterial[]> {
  try {
    // Costruisci il comando per eseguire lo script Python
    const scriptPath = path.join(__dirname, 'python_scraper.py');

    // Costruisci array di argomenti per il comando
    const args = [`"${moodleUrl}"`];
    if (username) args.push(`"${username}"`);
    if (password) args.push(`"${password}"`);

    // Esegui lo script Python
    console.log(`Esecuzione scraper Python: ${scriptPath}`);
    const { stdout, stderr } = await execAsync(`python3 ${scriptPath} ${args.join(' ')}`);

    if (stderr && !stdout) {
      console.error('Errore nello scraper Python:', stderr);
      throw new Error(`Errore durante lo scraping: ${stderr}`);
    }

    // Analizza l'output JSON
    try {
      const scrapedData = JSON.parse(stdout);

      // Verifica se c'è un errore
      if (scrapedData.error) {
        throw new Error(scrapedData.error);
      }

      console.log(`Materiali estratti: ${scrapedData.length}`);
      return scrapedData;
    } catch (parseError) {
      console.error('Errore parsing output Python:', parseError);
      console.log('Output raw:', stdout);
      throw new Error('Impossibile analizzare i risultati del moodle scraper');
    }
  } catch (error) {
    console.error('Errore nell\'esecuzione dello scraper:', error);
    throw error;
  }
}

/**
 * Analizza il contenuto dei materiali con Gemini
 */
export async function analyzeMaterialWithGemini(material: ScrapedMaterial): Promise<{analysis: string, summary: string}> {
  try {
    // Implementazione dell'analisi con Gemini
    // In una versione più avanzata, qui chiameremmo l'API di Gemini

    return {
      analysis: `Analisi approfondita di: ${material.title}\n\nQuesto materiale tratta argomenti rilevanti per il corso.`,
      summary: `Riassunto di ${material.title}: punti chiave del contenuto.`
    };
  } catch (error) {
    console.error('Errore nell\'analisi con Gemini:', error);
    return {
      analysis: "Errore nell'analisi del contenuto",
      summary: "Riassunto non disponibile"
    };
  }
}