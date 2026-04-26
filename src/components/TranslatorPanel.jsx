import { useMemo, useState } from 'react';
import { apiConfig, buildApiUrl } from '../lib/api';

function readTranslation(payload) {
	if (!payload) return '';

	if (typeof payload === 'string') return payload;

	const data = Array.isArray(payload.data) ? payload.data[0] : payload.data;
	const source = data || payload;

	return (
		source.translation ||
		source.translated_text ||
		source.translatedText ||
		source.text_es ||
		source.spanish ||
		source.espanol ||
		''
	);
}

export default function TranslatorPanel() {
	const [guarani, setGuarani] = useState('');
	const [spanish, setSpanish] = useState('');
	const [status, setStatus] = useState('idle');
	const [message, setMessage] = useState('');

	const endpoint = useMemo(() => buildApiUrl(apiConfig.translatePath, '/service'), []);
	const canTranslate = guarani.trim().length > 0 && status !== 'loading';

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
					text: guarani.trim(),
					source_language: 'guarani',
					target_language: 'spanish',
				}),
			});

			const payload = await response.json().catch(() => null);

			if (!response.ok || payload?.status === 'error') {
				throw new Error(payload?.message || 'No se pudo completar la traduccion.');
			}

			const translated = readTranslation(payload);
			setSpanish(translated || '');
			setStatus('success');
			setMessage(translated ? '' : 'La API respondio, pero no incluyo un texto traducido.');
		} catch (error) {
			setStatus('error');
			setMessage(error.message || 'No se pudo conectar con el traductor.');
		}
	}

	function clearText() {
		setGuarani('');
		setSpanish('');
		setMessage('');
		setStatus('idle');
	}

	return (
		<form className="translator" onSubmit={handleTranslate}>
			<div className="translator-tabs" aria-label="Tipo de traduccion">
				<button className="mode-tab active" type="button" aria-pressed="true">
					<span aria-hidden="true">T</span>
					Texto
				</button>
			</div>

			<div className="language-shell">
				<section className="language-column" aria-label="Texto en guarani">
					<div className="language-bar">
						<button className="chip active" type="button">Guarani</button>
					</div>
					<textarea
						aria-label="Texto en guarani"
						value={guarani}
						onChange={(event) => setGuarani(event.target.value)}
						placeholder="Ingresa texto"
						maxLength={5000}
						rows={9}
					/>
					<div className="panel-footer">
						<button
							className="icon-button"
							type="button"
							aria-label="Limpiar texto"
							onClick={clearText}
							disabled={!guarani && !spanish}
						>
							x
						</button>
						<span>{guarani.length}/5000</span>
					</div>
				</section>

				<div className="direction-lock" aria-hidden="true">{'->'}</div>

				<section className="language-column result" aria-label="Traduccion en espanol">
					<div className="language-bar">
						<button className="chip active" type="button">Espanol</button>
					</div>
					<textarea
						aria-label="Traduccion en espanol"
						value={spanish}
						onChange={(event) => setSpanish(event.target.value)}
						placeholder="Traduccion"
						rows={9}
					/>
					<div className="panel-footer result-footer">
						<span>{spanish ? 'Resultado generado' : 'Listo para traducir'}</span>
					</div>
				</section>
			</div>

			<div className="translator-actions">
				<button type="submit" disabled={!canTranslate}>
					{status === 'loading' ? 'Traduciendo...' : 'Traducir'}
				</button>
				{message ? <p className={`status ${status}`}>{message}</p> : null}
			</div>
		</form>
	);
}
