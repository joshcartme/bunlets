/**
 * Shared git helpers for the bunlets scripts.
 *
 * These run under Bun and use Bun Shell (`$`). They are pure I/O helpers:
 * on failure they throw, leaving the decision of how to report/exit to the
 * caller (so they can be reused from any script).
 */
import { $ } from "bun";

/** Throw if the current working directory is not inside a git work tree. */
export const assertInsideGitRepo = async (): Promise<void> => {
	const r = await $`git rev-parse --is-inside-work-tree`.nothrow().quiet();
	if (r.exitCode !== 0) {
		throw new Error("This is not a git repository.");
	}
};

/** Short name of the currently checked-out branch (e.g. "main"). */
export const getCurrentBranch = async (): Promise<string> =>
	(await $`git rev-parse --abbrev-ref HEAD`.text()).trim();

/**
 * Resolve a branch's short name to an existing ref, preferring the
 * remote-tracking copy. Returns "origin/<name>" or "<name>" if either exists,
 * otherwise null.
 */
const resolveBranchRef = async (name: string): Promise<string | null> => {
	for (const ref of [`origin/${name}`, name]) {
		const r = await $`git rev-parse --verify --quiet ${ref}`.nothrow().quiet();
		if (r.exitCode === 0) {
			return ref;
		}
	}
	return null;
};

/**
 * Best-effort detection of the repository's base / default branch, returned as
 * a short branch name (e.g. "main"). Tries, in order:
 *   1. origin/HEAD          (set by clone, or `git remote set-head origin -a`)
 *   2. init.defaultBranch   (Git 2.28+ configured default), if such a branch exists
 *   3. the usual suspects   (main, master, trunk, develop)
 *
 * Throws if none of these resolve.
 */
export const getBaseBranch = async (): Promise<string> => {
	// 1. origin/HEAD
	const head = await $`git rev-parse --abbrev-ref origin/HEAD`.nothrow().quiet();
	if (head.exitCode === 0) {
		const name = head.stdout.toString().trim().replace(/^origin\//, "");
		if (name && name !== "HEAD") {
			return name;
		}
	}

	// 2. init.defaultBranch (only if that branch actually exists here)
	const configured = await $`git config --get init.defaultBranch`.nothrow().quiet();
	if (configured.exitCode === 0) {
		const name = configured.stdout.toString().trim();
		if (name && (await resolveBranchRef(name))) {
			return name;
		}
	}

	// 3. usual remote or local branch names
	for (const name of ["main", "master", "trunk", "develop"]) {
		if (await resolveBranchRef(name)) {
			return name;
		}
	}

	throw new Error(
		"Could not determine base branch. Try: git fetch origin && git remote set-head origin -a",
	);
};
