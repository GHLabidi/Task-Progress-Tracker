<script lang="ts">
	import { ProgressBar } from '@skeletonlabs/skeleton';

	type TaskState = 'queued' | 'processing' | 'done' | 'error';
	type Task = {
		id: number;
		duration: number;
		progress: number;
		socketUrl: string;
		webSocket: WebSocket | null;
		state: TaskState;
	};

	let tasks = [] as Task[];
	let error = '';
	let addingTask = false;

	// a function to subscribe to the server's websocket so that we can get the progress of the task
	const subscribeToTask = (task: Task) => {
		task.webSocket = new WebSocket(task.socketUrl);
		task.webSocket.onmessage = (event) => {
			const message = JSON.parse(event.data);
			if (message.type === 'progress') {
				task.state = 'processing';
				task.progress = message.progress;
				// update the task in the tasks array
				tasks = tasks.map((t) => (t.id === task.id ? task : t));
				tasks = [...tasks];
			}
			if (message.type === 'done') {
				task.state = 'done';
				task.progress = 100;
				if (task.webSocket) task.webSocket.close();
				tasks = tasks.map((t) => (t.id === task.id ? task : t));
				tasks = [...tasks];
			}
		};
		task.webSocket.onerror = () => {
			task.state = 'error';
			tasks = tasks.map((t) => (t.id === task.id ? task : t));
			tasks = [...tasks];
			error = 'WebSocket error';
		};
		task.webSocket.onclose = () => {
			if (task.state !== 'done') {
				task.state = 'error';
				tasks = tasks.map((t) => (t.id === task.id ? task : t));
				tasks = [...tasks];
				error = 'WebSocket closed';
			}
		};
	};

	async function newTask() {
		addingTask = true;
		error = '';
		try {
			const response = await fetch('http://localhost:3000/new-task', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			const data = await response.json();
			if (response.ok) {
				let task = {
					id: data.id,
					duration: data.duration,
					progress: 0,
					socketUrl: data.socketUrl,
					state: 'queued'
				};

				tasks = [...tasks, task];
				subscribeToTask(task);
			} else {
				error = 'Failed to create new task';
			}
		} catch (e) {
			error = 'Cannot reach server';
		}
		addingTask = false;
	}
</script>

<div class="container h-screen mx-auto">
	<div class="space-y-5 flex flex-col justify-center items-center">
		<h1 class="text-3xl font-bold">Start Tasks</h1>
		<button
			class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
			on:click={async () => {
				await newTask();
			}}
			disabled={addingTask}
		>
			{#if addingTask}
				Adding Task...
			{:else}
				Add Task
			{/if}
		</button>
		{#if error}
			<p class="text-red-500">{error}</p>
		{/if}
		<p class="text-2xl font-bold">Tasks</p>
		<div class="flex flex-col justify-between items-center px-4 space-y-2 w-screen">
			{#each tasks as task (task.id)}
				<div
					class="w-[90%] h-24 space-y-2 p-2 rounded-md {task.state === 'queued'
						? 'variant-outline-secondary'
						: ''} {task.state === 'processing' ? 'variant-ghost-primary' : ''} {task.state ===
					'done'
						? 'variant-filled-primary'
						: ''} {task.state === 'error' ? 'variant-filled-error' : ''}"
				>
					<p class="text-xl text-center">Task ID: <b>{task.id}</b></p>
					<div class="flex flex-row justify-between items-center">
						<p class="text-md">ETA: <b>{task.duration}s</b></p>
						<p class="text-md">State: <b>{task.state}</b></p>
					</div>

					{#if task.state === 'processing'}
						<div class="w-full px-4">
							<ProgressBar value={task.progress} max={100} />
						</div>
					{/if}
				</div>
			{:else}
				<p class="text-xl text-center">No tasks</p>
			{/each}
		</div>
	</div>
</div>
