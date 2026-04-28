import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@nanostores/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	applyVoteCounts,
	communityKeys,
	createDefinition,
	deleteDefinition,
	fetchMyDefinitions,
	fetchTrends,
	getNextVote,
	updateDefinition,
	voteDefinition,
} from '../lib/communityApi';
import { userStore } from '../store/userStore';
import DefinitionCard from './DefinitionCard.jsx';
import QueryProvider from './QueryProvider.jsx';

function mutationMessage(payload, fallback) {
	return String(payload?.message || fallback)
		.replace(/Definition created\.?/gi, 'Definición creada.')
		.replace(/Definition updated\.?/gi, 'Definición actualizada.')
		.replace(/Definition deleted\.?/gi, 'Definición eliminada.')
		.replace(/\s*\(Toggle off\)\.?/gi, '');
}

function CommunityTrendsContent() {
	const queryClient = useQueryClient();
	const session = useStore(userStore);
	const [activeTab, setActiveTab] = useState('top');
	const [actionMessage, setActionMessage] = useState('');
	const [actionError, setActionError] = useState('');
	const [definitionVotes, setDefinitionVotes] = useState({});

	const [wordText, setWordText] = useState('');
	const [definitionText, setDefinitionText] = useState('');
	const [contextExample, setContextExample] = useState('');

	const userId = Number(session?.userProfile?.user_id || 0);
	const isLoggedIn = Boolean(session?.isLoggedIn && userId > 0);
	const canSubmitDefinition = Boolean(isLoggedIn && wordText.trim() && definitionText.trim());

	const {
		data: trends = [],
		status,
		error,
	} = useQuery({
		queryKey: communityKeys.trends,
		queryFn: fetchTrends,
	});
	const { data: myDefinitions = [] } = useQuery({
		queryKey: communityKeys.myDefinitions(userId),
		queryFn: () => fetchMyDefinitions(userId),
		enabled: isLoggedIn,
	});
	const ownedDefinitionIds = useMemo(
		() => new Set(myDefinitions.map((definition) => Number(definition.id)).filter(Boolean)),
		[myDefinitions],
	);

	const trendsForRender = useMemo(
		() =>
			trends.map((definition) => ({
				...definition,
				authorId:
					definition.authorId || (ownedDefinitionIds.has(Number(definition.id)) ? userId : definition.authorId),
				userVote: Object.prototype.hasOwnProperty.call(definitionVotes, definition.id)
					? definitionVotes[definition.id]
					: definition.userVote,
			})),
		[trends, definitionVotes, ownedDefinitionIds, userId],
	);

	const createMutation = useMutation({
		mutationFn: createDefinition,
		onSuccess: (payload) => {
			setActionError('');
			setActionMessage(mutationMessage(payload, 'Definición creada.'));
			setWordText('');
			setDefinitionText('');
			setContextExample('');
			setActiveTab('top');
			queryClient.invalidateQueries({ queryKey: communityKeys.trends });
			queryClient.invalidateQueries({ queryKey: communityKeys.myDefinitions(userId) });
		},
		onError: (mutationError) => {
			setActionMessage('');
			setActionError(mutationError?.message || 'No se pudo crear la definición.');
		},
	});

	const updateMutation = useMutation({
		mutationFn: updateDefinition,
		onMutate: async (variables) => {
			await queryClient.cancelQueries({ queryKey: communityKeys.trends });
			const previousTrends = queryClient.getQueryData(communityKeys.trends);

			queryClient.setQueryData(communityKeys.trends, (oldTrends = []) =>
				oldTrends.map((definition) =>
					Number(definition.id) === Number(variables.definitionId)
						? {
								...definition,
								definition: variables.definitionText,
								example: variables.contextExample,
							}
						: definition,
				),
			);

			return { previousTrends };
		},
		onSuccess: (payload) => {
			setActionError('');
			setActionMessage(mutationMessage(payload, 'Definición actualizada.'));
		},
		onError: (mutationError, _variables, context) => {
			if (context?.previousTrends) {
				queryClient.setQueryData(communityKeys.trends, context.previousTrends);
			}
			setActionMessage('');
			setActionError(mutationError?.message || 'No se pudo actualizar la definición.');
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: communityKeys.trends });
			queryClient.invalidateQueries({ queryKey: communityKeys.myDefinitions(userId) });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: deleteDefinition,
		onMutate: async (variables) => {
			await queryClient.cancelQueries({ queryKey: communityKeys.trends });
			const previousTrends = queryClient.getQueryData(communityKeys.trends);

			queryClient.setQueryData(communityKeys.trends, (oldTrends = []) =>
				oldTrends.filter((definition) => Number(definition.id) !== Number(variables.definitionId)),
			);

			return { previousTrends };
		},
		onSuccess: (payload) => {
			setActionError('');
			setActionMessage(mutationMessage(payload, 'Definición eliminada.'));
		},
		onError: (mutationError, _variables, context) => {
			if (context?.previousTrends) {
				queryClient.setQueryData(communityKeys.trends, context.previousTrends);
			}
			setActionMessage('');
			setActionError(mutationError?.message || 'No se pudo eliminar la definición.');
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: communityKeys.trends });
			queryClient.invalidateQueries({ queryKey: communityKeys.myDefinitions(userId) });
		},
	});

	const voteMutation = useMutation({
		mutationFn: voteDefinition,
		onMutate: async (variables) => {
			await queryClient.cancelQueries({ queryKey: communityKeys.trends });
			const previousTrends = queryClient.getQueryData(communityKeys.trends);
			const nextVote = getNextVote(variables.currentVote, variables.clickedVote);

			queryClient.setQueryData(communityKeys.trends, (oldTrends = []) =>
				oldTrends.map((definition) =>
					Number(definition.id) === Number(variables.definitionId)
						? applyVoteCounts(definition, variables.currentVote, variables.clickedVote)
						: definition,
				),
			);
			setDefinitionVotes((previous) => ({
				...previous,
				[variables.definitionId]: nextVote,
			}));

			return { previousTrends };
		},
		onSuccess: (payload) => {
			setActionError('');
			setActionMessage(mutationMessage(payload, 'Voto registrado.'));
		},
		onError: (mutationError, variables, context) => {
			if (context?.previousTrends) {
				queryClient.setQueryData(communityKeys.trends, context.previousTrends);
			}

			setDefinitionVotes((previous) => {
				const next = { ...previous };
				if (variables.hadLocalVote) {
					next[variables.definitionId] = variables.previousLocalVote;
				} else {
					delete next[variables.definitionId];
				}
				return next;
			});
			setActionMessage('');
			setActionError(mutationError?.message || 'No se pudo registrar el voto.');
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: communityKeys.trends });
		},
	});

	useEffect(() => {
		function onOpenCreate() {
			setActiveTab('create');
		}

		window.addEventListener('community-open-create', onOpenCreate);
		return () => window.removeEventListener('community-open-create', onOpenCreate);
	}, []);

	useEffect(() => {
		if (!isLoggedIn) {
			setDefinitionVotes({});
		}
	}, [isLoggedIn, userId]);

	function clearActionState() {
		setActionMessage('');
		setActionError('');
	}

	function handleCreateDefinition(event) {
		event.preventDefault();

		if (!isLoggedIn) {
			setActionError('Debes iniciar sesión para crear definiciones.');
			return;
		}

		clearActionState();
		createMutation.mutate({
			userId,
			wordText: wordText.trim(),
			definitionText: definitionText.trim(),
			contextExample: contextExample.trim(),
		});
	}

	function handleVote(definitionId, voteValue, currentVote) {
		if (!isLoggedIn) {
			setActionError('Debes iniciar sesión para votar.');
			return;
		}

		clearActionState();
		const nextVote = getNextVote(currentVote, voteValue);
		const hadLocalVote = Object.prototype.hasOwnProperty.call(definitionVotes, definitionId);
		voteMutation.mutate({
			userId,
			definitionId,
			voteValue: nextVote, // Enviamos explícitamente el valor final (0 para remover)
			clickedVote: voteValue, // Usamos clickedVote para el cálculo de optimistic UI
			currentVote,
			hadLocalVote,
			previousLocalVote: definitionVotes[definitionId],
		});
	}

	async function handleEdit(definitionId, values) {
		if (!isLoggedIn) {
			const loginError = new Error('Debes iniciar sesión para editar definiciones.');
			setActionError(loginError.message);
			throw loginError;
		}

		clearActionState();
		return updateMutation.mutateAsync({
			definitionId,
			userId,
			...values,
		});
	}

	function handleDelete(definitionId) {
		if (!isLoggedIn) {
			setActionError('Debes iniciar sesión para eliminar definiciones.');
			return;
		}

		clearActionState();
		deleteMutation.mutate({
			definitionId,
			userId,
		});
	}

	const votingDefinitionId = voteMutation.isPending ? voteMutation.variables?.definitionId : 0;
	const updatingDefinitionId = updateMutation.isPending ? updateMutation.variables?.definitionId : 0;
	const deletingDefinitionId = deleteMutation.isPending ? deleteMutation.variables?.definitionId : 0;

	return (
		<div className="grid gap-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div
					className="inline-flex rounded-full bg-[#f1f5f9] p-1"
					role="tablist"
					aria-label="Secciones de comunidad"
				>
					<button
						type="button"
						className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
							activeTab === 'top' ? 'bg-white text-[#1d4ed8] shadow-sm' : 'text-[#475569] hover:text-[#0f172a]'
						}`}
						onClick={() => setActiveTab('top')}
					>
						Top 50
					</button>
					<button
						type="button"
						className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
							activeTab === 'create' ? 'bg-white text-[#1d4ed8] shadow-sm' : 'text-[#475569] hover:text-[#0f172a]'
						}`}
						onClick={() => setActiveTab('create')}
					>
						Crear definición
					</button>
				</div>
			</div>

			{actionMessage ? (
				<p className="m-0 rounded-2xl bg-[#e8f5e9] px-4 py-3 text-sm font-semibold text-[#0f5f28]">
					{actionMessage}
				</p>
			) : null}
			{actionError ? (
				<p className="m-0 rounded-2xl bg-[#fceeee] px-4 py-3 text-sm font-semibold text-[#b3261e]">
					{actionError}
				</p>
			) : null}

			{activeTab === 'create' ? (
				isLoggedIn ? (
					<form className="grid gap-4 rounded-[28px] border border-[#d8e2f8] bg-white p-5 sm:p-6" onSubmit={handleCreateDefinition}>
						<label className="grid gap-2 text-sm font-bold text-[#374151]">
							Palabra
							<input
								type="text"
								value={wordText}
								onChange={(event) => setWordText(event.target.value)}
								maxLength={100}
								placeholder="Ej: Mba'éichapa"
								required
								className="h-12 rounded-2xl border border-[#d8e2f8] bg-white px-4 text-base text-[#111827] outline-none transition focus:border-[#1d4ed8] focus:ring-4 focus:ring-[#dbeafe]"
							/>
						</label>
						<label className="grid gap-2 text-sm font-bold text-[#374151]">
							Definición
							<textarea
								value={definitionText}
								onChange={(event) => setDefinitionText(event.target.value)}
								maxLength={1000}
								rows={4}
								placeholder="Escribe la definición en español o jopara."
								required
								className="min-h-32 resize-y rounded-2xl border border-[#d8e2f8] bg-white px-4 py-3 text-base leading-6 text-[#111827] outline-none transition focus:border-[#1d4ed8] focus:ring-4 focus:ring-[#dbeafe]"
							/>
						</label>
						<label className="grid gap-2 text-sm font-bold text-[#374151]">
							Ejemplo
							<textarea
								value={contextExample}
								onChange={(event) => setContextExample(event.target.value)}
								maxLength={1000}
								rows={3}
								placeholder="Ejemplo de uso en contexto."
								className="min-h-24 resize-y rounded-2xl border border-[#d8e2f8] bg-white px-4 py-3 text-base leading-6 text-[#111827] outline-none transition focus:border-[#1d4ed8] focus:ring-4 focus:ring-[#dbeafe]"
							/>
						</label>
						<button
							type="submit"
							className="min-h-12 justify-self-start rounded-full bg-[#1d4ed8] px-6 text-sm font-bold text-white transition hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:bg-[#d1d5db] disabled:text-[#6b7280] max-sm:w-full"
							disabled={!canSubmitDefinition || createMutation.isPending}
						>
							{createMutation.isPending ? 'Publicando...' : 'Publicar definición'}
						</button>
					</form>
				) : (
					<div className="grid place-items-center gap-3 rounded-[28px] border border-[#e2e8f0] bg-white px-6 py-12 text-center shadow-sm">
						<svg className="h-12 w-12 text-[#94a3b8] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
						</svg>
						<h3 className="m-0 text-xl font-bold text-[#0f172a]">Inicia sesión para aportar</h3>
						<p className="m-0 max-w-md text-base leading-relaxed text-[#475569]">
							Únete a la comunidad para crear y compartir tus propias definiciones con los demás usuarios.
						</p>
					</div>
				)
			) : null}

			{activeTab === 'top' ? (
				<>
					{status === 'pending' ? (
						<p className="m-0 rounded-[28px] border border-[#d8e2f8] bg-white p-8 text-center font-semibold text-[#5f6b7a]">
							Cargando tendencias...
						</p>
					) : null}
					{status === 'error' ? (
						<p className="m-0 rounded-[28px] border border-[#f2b8b5] bg-[#fceeee] p-8 text-center font-semibold text-[#b3261e]">
							{error?.message || 'No se pudo conectar con la comunidad.'}
						</p>
					) : null}
					{status === 'success' && trendsForRender.length === 0 ? (
						<p className="m-0 rounded-[28px] border border-[#d8e2f8] bg-white p-8 text-center font-semibold text-[#5f6b7a]">
							Aún no hay tendencias publicadas. Sé el primero en compartir una definición para la comunidad.
						</p>
					) : null}
					{trendsForRender.length > 0 ? (
						<div className="grid gap-5">
							{trendsForRender.map((definition) => (
								<DefinitionCard
									key={definition.id || `${definition.word}-${definition.definition}`}
									definition={definition}
									currentUserId={userId}
									isLoggedIn={isLoggedIn}
									currentVote={definition.userVote}
									onVote={handleVote}
									onEdit={handleEdit}
									onDelete={handleDelete}
									isVoting={Number(votingDefinitionId) === Number(definition.id)}
									isUpdating={Number(updatingDefinitionId) === Number(definition.id)}
									isDeleting={Number(deletingDefinitionId) === Number(definition.id)}
								/>
							))}
						</div>
					) : null}
				</>
			) : null}
		</div>
	);
}

export default function CommunityTrends() {
	return (
		<QueryProvider>
			<CommunityTrendsContent />
		</QueryProvider>
	);
}
