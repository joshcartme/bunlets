#!bun
import { $ } from "bun";

/*
 * construct a URL like
 * https://github.com/joshcartme/squiddly/compare/main...foo-branch
 */

const failIfNotGit = async () => {
	try {
		await $`git rev-parse --is-inside-work-tree`.text();
	} catch (e) {
		console.error("This is not a git repository.");
		process.exit(1);
	}
};

const getOriginUrl = async () => {
	let url = (await $`git remote get-url origin`.text()).trim();
	if (url.startsWith("git@")) {
		url = url.replace(":", "/").replace("git@", "https://");
	}
	return url.replace(/\.git$/, "");
};

const getBasebranch = async (): Promise<string> => {
	const tryRev = async (name: string) => {
		for (const ref of [`origin/${name}`, name]) {
			try {
				const out = (await $`git rev-parse --verify ${ref}`.text()).trim();
				if (out) {
					return ref;
				}
			} catch {
				/* ref missing */
			}
		}
		return null;
	};

	// 1. origin/HEAD (works after clone, or after: git remote set-head origin -a)
	try {
		const abbrev = (
			await $`git rev-parse --abbrev-ref origin/HEAD`.text()
		).trim();
		const name = abbrev.replace(/^origin\//, "");
		if (name && name !== "HEAD") {
			return name;
		}
	} catch {
		/* no origin/HEAD */
	}

	// 2. Git 2.28+ configured default for new repos
	try {
		const d = (await $`git config --get init.defaultBranch`.text()).trim();
		if (d && (await tryRev(d))) {
			return d;
		}
	} catch {
		/* unset */
	}

	// 3. Usual remote or local branch names (no symbolic ref needed)
	for (const name of ["main", "master", "trunk", "develop"]) {
		if (await tryRev(name)) {
			return name;
		}
	}

	console.error(
		"Could not determine base branch. Try: git fetch origin && git remote set-head origin -a",
	);
	process.exit(1);
};

const getCurrentBranch = async () =>
	(await $`git rev-parse --abbrev-ref HEAD`.text()).trim();

if (import.meta.main) {
	await failIfNotGit();
	const originUrl = await getOriginUrl();
	const baseBranch = await getBasebranch();
	const currentBranch = await getCurrentBranch();
	console.log(`${originUrl}/compare/${baseBranch}...${currentBranch}`);
}
