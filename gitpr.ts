#!bun
import { $ } from "bun";

import { assertInsideGitRepo, getBaseBranch, getCurrentBranch } from "./git.ts";

/*
 * construct a URL like
 * https://github.com/joshcartme/squiddly/compare/main...foo-branch
 */

const getOriginUrl = async () => {
	let url = (await $`git remote get-url origin`.text()).trim();
	if (url.startsWith("git@")) {
		url = url.replace(":", "/").replace("git@", "https://");
	}
	return url.replace(/\.git$/, "");
};

if (import.meta.main) {
	try {
		await assertInsideGitRepo();
		const originUrl = await getOriginUrl();
		const baseBranch = await getBaseBranch();
		const currentBranch = await getCurrentBranch();
		console.log(`${originUrl}/compare/${baseBranch}...${currentBranch}`);
	} catch (e) {
		console.error(e instanceof Error ? e.message : String(e));
		process.exit(1);
	}
}
