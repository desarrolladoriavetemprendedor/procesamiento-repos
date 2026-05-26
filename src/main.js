import './styles.css';

const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
const acceptedExtensions = ['.srt', '.json', '.txt'];
const acceptedTypes = acceptedExtensions.join(',');
const testWebhookPattern = /\/webhook-test(\/|$)/i;

const state = {
  files: [],
  isLoading: false,
  message: '',
  error: false,
  downloadUrl: '',
};

const app = document.querySelector('#app');

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
};

const isValidFile = (file) =>
  acceptedExtensions.some((extension) =>
    file.name.toLowerCase().endsWith(extension),
  );

const setMessage = (message, error = false) => {
  state.message = message;
  state.error = error;
  render();
};

const setLoading = (isLoading) => {
  state.isLoading = isLoading;
  render();
};

const clearDownloadUrl = () => {
  if (state.downloadUrl) {
    URL.revokeObjectURL(state.downloadUrl);
    state.downloadUrl = '';
  }
};

const updateFiles = (fileList) => {
  const files = Array.from(fileList).filter(isValidFile);
  state.files = files;

  if (files.length !== fileList.length) {
    setMessage(
      'Algunos archivos fueron ignorados. Solo se permiten archivos .srt, .json y .txt.',
      true,
    );
    return;
  }

  setMessage(files.length ? '' : 'Selecciona al menos un archivo.', false);
};

const downloadTextFile = async (response) => {
  const blob = await response.blob();

  if (!blob.size) {
    throw new Error('El webhook respondio sin contenido para descargar.');
  }

  clearDownloadUrl();

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  state.downloadUrl = url;
  link.href = url;
  link.download = 'secciones_detectadas.txt';
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  window.setTimeout(() => {
    link.remove();
  }, 1000);
};

const processFiles = async () => {
  if (!webhookUrl) {
    setMessage(
      'Falta configurar VITE_N8N_WEBHOOK_URL en las variables de entorno.',
      true,
    );
    return;
  }

  if (testWebhookPattern.test(webhookUrl)) {
    setMessage(
      'VITE_N8N_WEBHOOK_URL debe apuntar a la Production URL del webhook de n8n, no a la Test URL.',
      true,
    );
    return;
  }

  if (!state.files.length) {
    setMessage('Selecciona al menos un archivo antes de procesar.', true);
    return;
  }

  const formData = new FormData();
  state.files.forEach((file) => formData.append('files', file));

  try {
    setLoading(true);
    clearDownloadUrl();
    setMessage('Procesando transcripciones...', false);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let details = '';

      try {
        details = await response.text();
      } catch {
        details = '';
      }

      throw new Error(
        details || `El webhook respondio con estado ${response.status}.`,
      );
    }

    await downloadTextFile(response);
    setMessage(
      'Archivo procesado. Si la descarga no aparece, usa el enlace manual que aparece debajo.',
      false,
    );
  } catch (error) {
    clearDownloadUrl();
    const message =
      error instanceof Error
        ? error.message
        : 'Ocurrio un error al procesar las transcripciones.';

    setMessage(`No se pudo completar el proceso: ${message}`, true);
  } finally {
    setLoading(false);
  }
};

const handleFileChange = (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.files) return;
  updateFiles(input.files);
};

const render = () => {
  app.innerHTML = `
    <main class="page">
      <section class="panel">
        <p class="eyebrow">n8n workflow uploader</p>
        <h1>Detector de secciones en transcripciones</h1>
        <p class="intro">
          Sube uno o varios archivos de transcripcion para enviarlos al webhook de n8n y descargar el resultado procesado.
        </p>

        <label class="dropzone" for="files">
          <span class="dropzone-title">Selecciona tus archivos</span>
          <span class="dropzone-copy">Formatos permitidos: .srt, .json, .txt</span>
          <input id="files" name="files" type="file" accept="${acceptedTypes}" multiple />
        </label>

        <section class="file-list" aria-live="polite">
          <div class="file-list-header">
            <h2>Archivos seleccionados</h2>
            <span>${state.files.length} archivo(s)</span>
          </div>
          ${
            state.files.length
              ? `<ul>${state.files
                  .map(
                    (file) => `
                      <li>
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">${formatBytes(file.size)}</span>
                      </li>`,
                  )
                  .join('')}</ul>`
              : '<p class="empty-state">Todavia no has seleccionado archivos.</p>'
          }
        </section>

        <button class="submit" type="button" ${
          state.isLoading ? 'disabled' : ''
        }>
          ${state.isLoading ? 'Procesando...' : 'Procesar transcripciones'}
        </button>

        ${
          state.message
            ? `<p class="status ${state.error ? 'status-error' : 'status-info'}">${state.message}</p>`
            : ''
        }
        ${
          state.downloadUrl
            ? `
              <a class="download-link" href="${state.downloadUrl}" download="secciones_detectadas.txt">
                Descargar secciones_detectadas.txt
              </a>
            `
            : ''
        }
      </section>
    </main>
  `;

  const input = document.querySelector('#files');
  const button = document.querySelector('.submit');

  input?.addEventListener('change', handleFileChange);
  button?.addEventListener('click', processFiles);
};

render();
