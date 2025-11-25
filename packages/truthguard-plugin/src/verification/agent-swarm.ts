import type {
  SwarmTask,
  SwarmAgentType,
  DetectionResult,
  FusionResult,
} from "../types";
import { analyzeVisualContent } from "../detection/visual";
import { analyzeAudioContent } from "../detection/audio";
import { analyzeTextContent } from "../detection/text";
import { fuseDetectionResults } from "../detection/fusion";

export interface SwarmAgent {
  id: string;
  type: SwarmAgentType;
  status: "idle" | "busy" | "offline";
  tasksCompleted: number;
  accuracy: number;
  specialization: string[];
}

export class VerificationSwarm {
  private agents: Map<string, SwarmAgent> = new Map();
  private tasks: Map<string, SwarmTask> = new Map();
  private taskQueue: SwarmTask[] = [];

  constructor() {
    this.initializeAgents();
  }

  /**
   * Initialize specialized agents
   */
  private initializeAgents(): void {
    const agentTypes: Array<{ type: SwarmAgentType; count: number }> = [
      { type: "visual_specialist", count: 2 },
      { type: "audio_specialist", count: 2 },
      { type: "text_specialist", count: 2 },
      { type: "metadata_analyst", count: 1 },
      { type: "fusion_coordinator", count: 1 },
      { type: "consensus_builder", count: 1 },
      { type: "evidence_collector", count: 1 },
    ];

    for (const { type, count } of agentTypes) {
      for (let i = 0; i < count; i++) {
        const agent: SwarmAgent = {
          id: `${type}-${i}`,
          type,
          status: "idle",
          tasksCompleted: 0,
          accuracy: 0.85,
          specialization: [type],
        };
        this.agents.set(agent.id, agent);
      }
    }
  }

  /**
   * Create verification task
   */
  public createTask(
    type: SwarmAgentType,
    contentId: string,
    priority: SwarmTask["priority"] = "medium",
  ): SwarmTask {
    const task: SwarmTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      contentId,
      priority,
      status: "pending",
      createdAt: Date.now(),
    };

    this.tasks.set(task.id, task);
    this.taskQueue.push(task);
    this.taskQueue.sort((a, b) => this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority));

    return task;
  }

  /**
   * Get priority value for sorting
   */
  private getPriorityValue(priority: SwarmTask["priority"]): number {
    const values = { critical: 4, high: 3, medium: 2, low: 1 };
    return values[priority];
  }

  /**
   * Assign task to available agent
   */
  private async assignTask(task: SwarmTask): Promise<void> {
    const availableAgent = Array.from(this.agents.values()).find(
      (agent) => agent.type === task.type && agent.status === "idle",
    );

    if (!availableAgent) {
      // Task stays in queue
      return;
    }

    task.status = "assigned";
    task.assignedTo = availableAgent.id;
    availableAgent.status = "busy";

    // Execute task
    await this.executeTask(task, availableAgent);
  }

  /**
   * Execute agent task
   */
  private async executeTask(task: SwarmTask, agent: SwarmAgent): Promise<void> {
    task.status = "processing";

    try {
      let result: DetectionResult | FusionResult;

      switch (agent.type) {
        case "visual_specialist":
          result = await analyzeVisualContent({
            imageUrl: `content://${task.contentId}`,
          });
          break;

        case "audio_specialist":
          result = await analyzeAudioContent({
            audioUrl: `content://${task.contentId}`,
          });
          break;

        case "text_specialist":
          result = await analyzeTextContent({
            text: `content://${task.contentId}`,
          });
          break;

        case "metadata_analyst":
          result = await this.analyzeMetadata(task.contentId);
          break;

        case "fusion_coordinator":
          result = await this.coordinateFusion(task.contentId);
          break;

        case "consensus_builder":
          result = await this.buildConsensus(task.contentId);
          break;

        case "evidence_collector":
          result = await this.collectEvidence(task.contentId);
          break;

        default:
          throw new Error(`Unknown agent type: ${agent.type}`);
      }

      task.result = result;
      task.status = "completed";
      task.completedAt = Date.now();
      agent.tasksCompleted++;
    } catch (error) {
      task.status = "failed";
      console.error(`Task ${task.id} failed:`, error);
    } finally {
      agent.status = "idle";
      this.processQueue();
    }
  }

  /**
   * Analyze metadata
   */
  private async analyzeMetadata(contentId: string): Promise<DetectionResult> {
    // Placeholder - would analyze EXIF, timestamps, etc.
    return {
      modality: "metadata",
      confidence: 0.7,
      isSynthetic: false,
      evidence: [
        {
          type: "metadata_analysis",
          description: "Metadata analysis completed",
          confidence: 0.7,
        },
      ],
      modelVersion: "metadata-v1.0",
      timestamp: Date.now(),
    };
  }

  /**
   * Coordinate multi-modal fusion
   */
  private async coordinateFusion(contentId: string): Promise<FusionResult> {
    // Get all detection results for this content
    const detectionTasks = Array.from(this.tasks.values()).filter(
      (t) => t.contentId === contentId && t.status === "completed" && t.result,
    );

    const results = detectionTasks
      .map((t) => t.result)
      .filter((r): r is DetectionResult => r !== undefined && "modality" in r);

    if (results.length === 0) {
      throw new Error(`No detection results for content ${contentId}`);
    }

    return fuseDetectionResults(results, { method: "deep_fusion" });
  }

  /**
   * Build consensus from validators
   */
  private async buildConsensus(contentId: string): Promise<FusionResult> {
    // Placeholder - would aggregate validator votes
    const fusionResult = await this.coordinateFusion(contentId);
    return fusionResult;
  }

  /**
   * Collect and verify evidence
   */
  private async collectEvidence(contentId: string): Promise<DetectionResult> {
    // Placeholder - would collect and verify all evidence
    return {
      modality: "fusion",
      confidence: 0.85,
      isSynthetic: true,
      evidence: [
        {
          type: "evidence_collection",
          description: "Evidence collection completed",
          confidence: 0.85,
        },
      ],
      modelVersion: "evidence-collector-v1.0",
      timestamp: Date.now(),
    };
  }

  /**
   * Process task queue
   */
  private async processQueue(): Promise<void> {
    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      if (task && task.status === "pending") {
        await this.assignTask(task);
      }
    }
  }

  /**
   * Get swarm status
   */
  public getStatus(): {
    agents: number;
    activeTasks: number;
    completedTasks: number;
    queuedTasks: number;
  } {
    const activeTasks = Array.from(this.tasks.values()).filter(
      (t) => t.status === "processing" || t.status === "assigned",
    ).length;

    const completedTasks = Array.from(this.tasks.values()).filter(
      (t) => t.status === "completed",
    ).length;

    return {
      agents: this.agents.size,
      activeTasks,
      completedTasks,
      queuedTasks: this.taskQueue.length,
    };
  }

  /**
   * Start content verification workflow
   */
  public async verifyContent(contentId: string, contentType: string): Promise<FusionResult> {
    const tasks: SwarmTask[] = [];

    // Create detection tasks based on content type
    if (contentType.includes("image") || contentType.includes("video")) {
      tasks.push(this.createTask("visual_specialist", contentId, "high"));
    }

    if (contentType.includes("audio") || contentType.includes("video")) {
      tasks.push(this.createTask("audio_specialist", contentId, "high"));
    }

    if (contentType.includes("text")) {
      tasks.push(this.createTask("text_specialist", contentId, "high"));
    }

    // Always analyze metadata
    tasks.push(this.createTask("metadata_analyst", contentId, "medium"));

    // Process all detection tasks
    await this.processQueue();

    // Wait for all detection tasks to complete
    await this.waitForTasks(tasks.map((t) => t.id));

    // Create fusion task
    const fusionTask = this.createTask("fusion_coordinator", contentId, "critical");
    await this.processQueue();
    await this.waitForTasks([fusionTask.id]);

    const result = fusionTask.result as FusionResult;
    if (!result) {
      throw new Error("Fusion task did not produce result");
    }

    return result;
  }

  /**
   * Wait for tasks to complete
   */
  private async waitForTasks(taskIds: string[]): Promise<void> {
    const checkInterval = 100; // ms
    const maxWait = 60000; // 60 seconds
    let waited = 0;

    while (waited < maxWait) {
      const allComplete = taskIds.every((id) => {
        const task = this.tasks.get(id);
        return task && (task.status === "completed" || task.status === "failed");
      });

      if (allComplete) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    throw new Error("Task timeout exceeded");
  }
}
