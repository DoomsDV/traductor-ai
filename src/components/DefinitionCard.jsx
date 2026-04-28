import { useState } from 'react';
import CommentThread from './CommentThread.jsx';
import ConfirmModal from './ConfirmModal.jsx';

function ArrowIcon({ direction }) {
	const isUp = direction === 'up';

	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
			{isUp ? (
				<path d="M12 5.2 5.5 11.7l1.4 1.4 4.1-4.1V19h2V9l4.1 4.1 1.4-1.4L12 5.2Z" />
			) : (
				<path d="M12 18.8 18.5 12.3l-1.4-1.4-4.1 4.1V5h-2v10l-4.1-4.1-1.4 1.4L12 18.8Z" />
			)}
		</svg>
	);
}

function DotsIcon() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
			<path d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
		</svg>
	);
}

function CommentIcon() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
			<path d="M4 4h16v11H7.8L4 18.8V4Zm2 2v8l1-1h11V6H6Z" />
		</svg>
	);
}

function VoteButton({ direction, selected, disabled, onClick }) {
	const isUp = direction === 'up';
	const label = isUp ? 'Votar a favor' : 'Votar en contra';
	const selectedClasses = isUp
		? 'bg-[#1d4ed8] text-white'
		: 'bg-[#b3261e] text-white';

	return (
		<button
			type="button"
			aria-label={label}
			title={label}
			disabled={disabled}
			onClick={onClick}
			className={`grid h-9 w-9 place-items-center rounded-full transition duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
				selected ? selectedClasses : 'text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0f172a]'
			}`}
		>
			<ArrowIcon direction={direction} />
		</button>
	);
}

export default function DefinitionCard({
	definition,
	currentUserId,
	isLoggedIn,
	currentVote,
	onVote,
	onEdit,
	onDelete,
	isVoting = false,
	isUpdating = false,
	isDeleting = false,
}) {
	const [commentsOpen, setCommentsOpen] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const [editing, setEditing] = useState(false);
	const [draftDefinition, setDraftDefinition] = useState(definition.definition || '');
	const [draftExample, setDraftExample] = useState(definition.example || '');
	const [editError, setEditError] = useState('');
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);

	const authorId = Number(definition.authorId || 0);
	const isAuthor = Boolean(currentUserId && authorId && Number(currentUserId) === authorId);
	const canVote = Boolean(isLoggedIn && definition.id && !isVoting && !isDeleting);

	async function submitEdit(event) {
		event.preventDefault();
		const cleanDefinition = draftDefinition.trim();

		if (!cleanDefinition) return;

		try {
			setEditError('');
			await onEdit(definition.id, {
				definitionText: cleanDefinition,
				contextExample: draftExample.trim(),
			});
			setEditing(false);
			setMenuOpen(false);
		} catch (error) {
			setEditError(error?.message || 'No se pudo actualizar la definición.');
		}
	}

	function beginEdit() {
		setDraftDefinition(definition.definition || '');
		setDraftExample(definition.example || '');
		setEditError('');
		setEditing(true);
		setMenuOpen(false);
	}

	function requestDelete() {
		setMenuOpen(false);
		setDeleteModalOpen(true);
	}

	function confirmDelete() {
		setDeleteModalOpen(false);
		onDelete(definition.id);
	}

	return (
		<article className="rounded-3xl border border-[#e2e8f0] bg-white p-4 shadow-[0_4px_20px_-12px_rgba(29,78,216,0.15)] transition duration-300 hover:-translate-y-0.5 hover:border-[#cbd5e1] hover:shadow-[0_12px_32px_-16px_rgba(29,78,216,0.25)] sm:p-5">
			<div className="grid gap-4 sm:grid-cols-[64px_minmax(0,1fr)]">
				<div
					className="flex w-fit min-w-16 items-center gap-2 py-2 text-[#1d4ed8] sm:flex-col sm:justify-start sm:pt-1 sm:min-h-20 sm:w-16 sm:gap-1"
					aria-label={`${definition.score} puntos`}
				>
					<strong className="text-3xl leading-none font-black text-center text-[#0f172a]">{definition.score}</strong>
					<span className="text-[10px] font-bold uppercase tracking-widest text-[#64748b]">PTS</span>
				</div>

				<div className="min-w-0">
					<header className="relative flex items-start justify-between gap-3">
						<div className="min-w-0">
							<div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[#64748b]">
								<span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#f1f5f9] text-[11px] font-bold text-[#1d4ed8]">
									{(definition.author || 'C').charAt(0).toUpperCase()}
								</span>
								<span className="font-semibold text-[#334155]">{definition.author || 'Comunidad'}</span>
								{definition.dateFormatted ? <span className="text-[11px] text-[#9ca3af]">{definition.dateFormatted}</span> : null}
							</div>
							<h3 className="m-0 text-2xl font-extrabold tracking-tight text-[#0f172a]">{definition.word || 'Sin palabra'}</h3>
						</div>

						{isAuthor ? (
							<div className="relative shrink-0">
								<button
									type="button"
									aria-label="Opciones de definición"
									title="Opciones"
									className="grid h-11 w-11 place-items-center rounded-full text-[#4b5563] transition hover:bg-[#eef5ff] hover:text-[#1d4ed8]"
									onClick={() => setMenuOpen((value) => !value)}
								>
									<DotsIcon />
								</button>
								{menuOpen ? (
									<div className="absolute right-0 z-10 mt-2 grid min-w-36 gap-1 rounded-2xl border border-[#d8e2f8] bg-white p-2 shadow-[0_18px_42px_-24px_rgba(17,24,39,0.5)]">
										<button
											type="button"
											className="rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#111827] hover:bg-[#eef5ff]"
											onClick={beginEdit}
										>
											Editar
										</button>
										<button
											type="button"
											className="rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#b3261e] hover:bg-[#fceeee]"
											onClick={requestDelete}
											disabled={isDeleting}
										>
											Eliminar
										</button>
									</div>
								) : null}
							</div>
						) : null}
					</header>

					{editing ? (
						<form className="mt-5 grid gap-3" onSubmit={submitEdit}>
							<label className="grid gap-2 text-sm font-semibold text-[#374151]">
								Definición
								<textarea
									value={draftDefinition}
									onChange={(event) => setDraftDefinition(event.target.value)}
									rows={4}
									maxLength={1000}
									required
									className="min-h-28 resize-y rounded-2xl border border-[#d8e2f8] bg-white px-4 py-3 text-base leading-6 text-[#111827] outline-none transition focus:border-[#1d4ed8] focus:ring-4 focus:ring-[#dbeafe]"
								/>
							</label>
							<label className="grid gap-2 text-sm font-semibold text-[#374151]">
								Ejemplo
								<textarea
									value={draftExample}
									onChange={(event) => setDraftExample(event.target.value)}
									rows={3}
									maxLength={1000}
									className="min-h-24 resize-y rounded-2xl border border-[#d8e2f8] bg-white px-4 py-3 text-base leading-6 text-[#111827] outline-none transition focus:border-[#1d4ed8] focus:ring-4 focus:ring-[#dbeafe]"
								/>
							</label>
							<div className="flex flex-wrap gap-2">
								<button
									type="submit"
									disabled={isUpdating || !draftDefinition.trim()}
									className="rounded-full bg-[#1d4ed8] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:bg-[#d1d5db] disabled:text-[#6b7280]"
								>
									{isUpdating ? 'Guardando...' : 'Guardar'}
								</button>
								<button
									type="button"
									className="rounded-full px-5 py-2.5 text-sm font-bold text-[#1d4ed8] transition hover:bg-[#eef5ff]"
									onClick={() => setEditing(false)}
								>
									Cancelar
								</button>
							</div>
							{editError ? <p className="m-0 text-sm font-semibold text-[#b3261e]">{editError}</p> : null}
						</form>
					) : (
						<>
							<p className="mt-3 max-w-4xl text-[15px] leading-relaxed text-[#1e293b]">{definition.definition}</p>
							{definition.example ? (
								<div className="mt-3 relative rounded-2xl bg-[#f8fafc] px-5 py-4 text-[14px] italic leading-relaxed text-[#475569] shadow-inner">
									<svg className="absolute left-3 top-3 h-5 w-5 text-[#cbd5e1] opacity-50" fill="currentColor" viewBox="0 0 32 32" aria-hidden="true">
										<path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
									</svg>
									<p className="relative z-10 m-0 ml-5">{definition.example}</p>
								</div>
							) : null}

							<footer className="mt-4 flex flex-wrap items-center justify-between gap-3">
								<div className="inline-flex items-center gap-1 rounded-full bg-[#f1f5f9] p-1" aria-label="Votos de definición">
									<VoteButton
										direction="up"
										selected={Number(currentVote) === 1}
										disabled={!canVote}
										onClick={() => onVote(definition.id, 1, currentVote)}
									/>
									<span className="min-w-[40px] text-center text-sm font-bold text-[#475569]">
										{definition.upvotes} / {definition.downvotes}
									</span>
									<VoteButton
										direction="down"
										selected={Number(currentVote) === -1}
										disabled={!canVote}
										onClick={() => onVote(definition.id, -1, currentVote)}
									/>
								</div>
								<button
									type="button"
									className="inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-bold text-[#475569] transition hover:bg-[#f1f5f9] hover:text-[#0f172a]"
									onClick={() => setCommentsOpen((value) => !value)}
									aria-expanded={commentsOpen}
								>
									<CommentIcon />
									{commentsOpen ? 'Ocultar comentarios' : 'Comentarios'}
								</button>
							</footer>
						</>
					)}
				</div>
			</div>

			{commentsOpen ? (
				<div className="mt-6 border-t border-[#e3ebfb] pt-5">
					<CommentThread definitionId={definition.id} currentUserId={currentUserId} isLoggedIn={isLoggedIn} />
				</div>
			) : null}

			<ConfirmModal
				isOpen={deleteModalOpen}
				title="Eliminar definición"
				message="¿Estás seguro de que deseas eliminar esta definición? Esta acción no se puede deshacer."
				confirmText="Eliminar"
				cancelText="Cancelar"
				isDestructive={true}
				onConfirm={confirmDelete}
				onCancel={() => setDeleteModalOpen(false)}
			/>
		</article>
	);
}
