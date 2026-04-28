import { useMemo, useState } from 'react';
import { apiConfig, buildApiUrl } from '../lib/api';

const LANGUAGES = {
	guarani: {
		key: 'guarani',
		label: 'Guaran\u00ed',
		apiName: 'Guaran\u00ed',
	},
	spanish: {
		key: 'spanish',
		label: 'Espa\u00f1ol',
		apiName: 'Espa\u00f1ol',
	},
};

function readTranslation(payload) {
	if (!payload) return '';

	if (typeof payload === 'string') return payload;

	const data = Array.isArray(payload.data) ? payload.data[0] : payload.data;
	const source = data || payload;

	return (
		source.translation ||
		source.TRANSLATION ||
		source.translated_text ||
		source.TRANSLATED_TEXT ||
		source.translatedText ||
		source.text_es ||
		source.TEXT_ES ||
		source.spanish ||
		source.SPANISH ||
		source.espanol ||
		source.ESPANOL ||
		''
	);
}

function sanitizeText(text) {
	if (!text) return '';
	// Elimina caracteres de control invisibles que puedan corromper el JSON en el backend, conservando saltos de línea y tabulaciones
	return text.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '');
}

export default function TranslatorPanel() {
	const [sourceLang, setSourceLang] = useState(LANGUAGES.guarani);
	const [targetLang, setTargetLang] = useState(LANGUAGES.spanish);
	const [sourceText, setSourceText] = useState('');
	const [resultText, setResultText] = useState('');
	const [status, setStatus] = useState('idle');
	const [message, setMessage] = useState('');
	const [copyState, setCopyState] = useState('idle');

	const endpoint = useMemo(() => buildApiUrl(apiConfig.translatePath, '/service'), []);
	const canTranslate = sourceText.trim().length > 0 && status !== 'loading';

	async function handleTranslate(event) {
		event.preventDefault();
		if (!canTranslate) return;

		setStatus('loading');
		setMessage('');

		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					text: sanitizeText(sourceText).trim(),
					source_lang: sourceLang.apiName,
					target_lang: targetLang.apiName,
				}),
			});

			const payload = await response.json().catch(() => null);

			if (!response.ok || payload?.status === 'error') {
				throw new Error(payload?.message || 'No se pudo completar la traduccion.');
			}

			const translated = readTranslation(payload);
			setResultText(translated || '');
			setCopyState('idle');
			setStatus('success');
			setMessage(translated ? '' : 'La API respondio, pero no incluyo un texto traducido.');
		} catch (error) {
			setStatus('error');
			setMessage(error.message || 'No se pudo conectar con el traductor.');
		}
	}

	function clearText() {
		setSourceText('');
		setResultText('');
		setMessage('');
		setCopyState('idle');
		setStatus('idle');
	}

	function swapLanguages() {
		if (status === 'loading') return;

		const nextSourceText = resultText || sourceText;
		const nextResultText = resultText ? sourceText : '';

		setSourceLang(targetLang);
		setTargetLang(sourceLang);
		setSourceText(nextSourceText);
		setResultText(nextResultText);
		setMessage('');
		setCopyState('idle');
		setStatus(nextResultText ? 'success' : 'idle');
	}

	async function copyTranslation() {
		if (!resultText) return;

		try {
			await navigator.clipboard.writeText(resultText);
			setCopyState('copied');
			window.setTimeout(() => setCopyState('idle'), 1800);
		} catch {
			setCopyState('error');
		}
	}

	return (
		<form className="translator" onSubmit={handleTranslate}>
			<div className="translator-language-row" aria-label="Idiomas de traduccion">
				<button className="chip active" type="button">{sourceLang.label}</button>
				<button
					className="language-row-swap"
					type="button"
					aria-label={`Invertir idiomas: ${sourceLang.label} a ${targetLang.label}`}
					title={`Invertir idiomas: ${sourceLang.label} a ${targetLang.label}`}
					onClick={swapLanguages}
					disabled={status === 'loading'}
				>
					<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
						<path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z" />
					</svg>
				</button>
				<button className="chip active" type="button">{targetLang.label}</button>
			</div>

			<div className="language-shell">
				<section className="language-column source" aria-label={`Texto en ${sourceLang.label}`}>
					<div className="language-bar">
						<button className="chip active" type="button">{sourceLang.label}</button>
					</div>
					<textarea
						aria-label={`Texto en ${sourceLang.label}`}
						value={sourceText}
						onChange={(event) => setSourceText(event.target.value)}
						placeholder="Ingresa texto"
						maxLength={500}
						rows={9}
					/>
					<div className="panel-footer">
						<div className="input-meta">
							<button
								className="icon-button"
								type="button"
								aria-label="Limpiar texto"
								title="Limpiar texto"
								onClick={clearText}
								disabled={!sourceText && !resultText}
							>
								<svg viewBox="0 0 24 24" aria-hidden="true">
									<path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4-6.3-6.3-6.3 6.3-1.4-1.4L9.2 12 2.9 5.7l1.4-1.4 6.3 6.3 6.3-6.3 1.4 1.4Z" />
								</svg>
							</button>
							<span>{sourceText.length}/500</span>
						</div>
						<button className="translate-button" type="submit" disabled={!canTranslate}>
							{status === 'loading' ? 'Traduciendo...' : 'Traducir'}
						</button>
					</div>
				</section>

				<button
					className="swap-button"
					type="button"
					aria-label={`Invertir idiomas: ${sourceLang.label} a ${targetLang.label}`}
					title={`Invertir idiomas: ${sourceLang.label} a ${targetLang.label}`}
					onClick={swapLanguages}
					disabled={status === 'loading'}
				>
					<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
						<path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z" />
					</svg>
				</button>

				<section className="language-column result" aria-label={`Traduccion en ${targetLang.label}`}>
					<div className="language-bar">
						<button className="chip active" type="button">{targetLang.label}</button>
					</div>
					<textarea
						aria-label={`Traduccion en ${targetLang.label}`}
						value={resultText}
						onChange={(event) => setResultText(event.target.value)}
						placeholder="Traducci&oacute;n"
						rows={9}
					/>
					<div className="panel-footer result-footer">
						<span>
							{copyState === 'copied'
								? 'Copiado'
								: copyState === 'error'
									? 'No se pudo copiar'
									: resultText
										? 'Resultado generado'
										: 'Listo para traducir'}
						</span>
						<button
							className="icon-button"
							type="button"
							aria-label="Copiar traduccion"
							title="Copiar traduccion"
							onClick={copyTranslation}
							disabled={!resultText}
						>
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M16 1H4v14h2V3h10V1Zm3 4H8v18h11V5Zm-2 2v14h-7V7h7Z" />
							</svg>
						</button>
					</div>
				</section>
			</div>

			{message ? <p className={`status ${status}`}>{message}</p> : null}
		</form>
	);
}
