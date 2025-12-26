import { WorkflowEntrypoint, WorkflowStep } from 'cloudflare:workers';
import type { WorkflowEvent } from 'cloudflare:workers'

export class GenerateStorageImageWorkflow extends WorkflowEntrypoint<Env, unknown> {
	async run(_event: Readonly<WorkflowEvent<unknown>>, step: WorkflowStep) {
		const image = await step.do('generate image', async () => {
			return {
				a: 'b',
			};
		});

		console.log(image);
	}
}
