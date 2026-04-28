import { atom } from 'nanostores';

const STORAGE_KEY = 'traductor_ia_session_dev';
const isBrowser = typeof window !== 'undefined';
const isDev = import.meta.env.DEV;

const EMPTY_PROFILE = {
	user_id: null,
	email: '',
	display_name: '',
	profile_pic_url: '',
	reputation_score: 0,
};

function normalizeProfile(profile) {
	return {
		...EMPTY_PROFILE,
		...profile,
		email: typeof profile?.email === 'string' ? profile.email.trim().toLowerCase() : '',
		reputation_score: Number(profile?.reputation_score || 0),
	};
}

function createEmptySession() {
	return {
		isLoggedIn: false,
		userProfile: { ...EMPTY_PROFILE },
	};
}

function readDevSession() {
	if (!isBrowser || !isDev) return createEmptySession();

	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return createEmptySession();

		const parsed = JSON.parse(raw);
		const profile = normalizeProfile(parsed?.userProfile);
		if (!parsed?.isLoggedIn || !profile.email) return createEmptySession();

		return {
			isLoggedIn: true,
			userProfile: profile,
		};
	} catch {
		return createEmptySession();
	}
}

function persistDevSession(session) {
	if (!isBrowser || !isDev) return;

	try {
		if (!session.isLoggedIn) {
			window.localStorage.removeItem(STORAGE_KEY);
			return;
		}

		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
	} catch {
		/* no-op: localStorage can be unavailable */
	}
}

export const userStore = atom(readDevSession());

export function loginUser(profile) {
	const normalizedProfile = normalizeProfile(profile);

	if (!normalizedProfile.email) {
		const session = createEmptySession();
		userStore.set(session);
		persistDevSession(session);
		return false;
	}

	const session = {
		isLoggedIn: true,
		userProfile: normalizedProfile,
	};

	userStore.set(session);
	persistDevSession(session);
	return true;
}

export function logoutUser() {
	const session = createEmptySession();
	userStore.set(session);
	persistDevSession(session);
}
