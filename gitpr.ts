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

const getBasebranch = async () => {
	// origin/HEAD -> origin/main
	const branchInfo = await $` git branch -r --list 'origin/HEAD'`.text();
	const branch = branchInfo
		.split(" ")
		.pop() // origin/main
		?.split("/")
		.pop() // main
		?.trim();
	if (!branch) {
		console.error("Could not determine base branch.");
		process.exit(1);
	}
	return branch;
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
