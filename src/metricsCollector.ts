import * as vscode from 'vscode';

export interface UsageMetrics {
    totalRequests: number;
    totalTokens: {
        input: number;
        output: number;
    };
    averageResponseTime: number;
    modelUsage: Record<string, {
        requests: number;
        tokens: {
            input: number;
            output: number;
        };
        totalTime: number;
    }>;
    dailyUsage: Record<string, {
        requests: number;
        tokens: {
            input: number;
            output: number;
        };
    }>;
    errorRate: number;
    lastActivity: number;
}

export class MetricsCollector {
    private static readonly METRICS_STATE_KEY = 'opencode.metrics';
    private metrics: UsageMetrics;
    private sessionStart: number;
    private responseTimes: number[] = [];
    private globalState: vscode.Memento | undefined;

    constructor(context?: vscode.ExtensionContext) {
        this.globalState = context?.globalState;
        this.metrics = {
            totalRequests: 0,
            totalTokens: { input: 0, output: 0 },
            averageResponseTime: 0,
            modelUsage: {},
            dailyUsage: {},
            errorRate: 0,
            lastActivity: Date.now()
        };
        this.sessionStart = Date.now();
        this.loadMetrics();
    }

    private loadMetrics(): void {
        const saved = this.globalState?.get<UsageMetrics>(MetricsCollector.METRICS_STATE_KEY);
        if (saved) {
            this.metrics = { ...this.metrics, ...saved };
            this.sessionStart = Date.now();
        }
    }

    private saveMetrics(): void {
        void this.globalState?.update(MetricsCollector.METRICS_STATE_KEY, this.metrics);
    }

    recordRequest(
        model: string | undefined,
        tokens: { input: number; output: number },
        responseTime: number,
        isError: boolean = false
    ): void {
        const modelKey = model || 'default';
        this.metrics.totalRequests++;
        this.metrics.totalTokens.input += tokens.input;
        this.metrics.totalTokens.output += tokens.output;
        
        // Update response times
        this.responseTimes.push(responseTime);
        if (this.responseTimes.length > 100) {
            this.responseTimes.shift();
        }
        
        // Calculate average response time
        this.metrics.averageResponseTime = 
            this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;

        // Update model usage
        if (!this.metrics.modelUsage[modelKey]) {
            this.metrics.modelUsage[modelKey] = {
                requests: 0,
                tokens: { input: 0, output: 0 },
                totalTime: 0
            };
        }
        
        this.metrics.modelUsage[modelKey].requests++;
        this.metrics.modelUsage[modelKey].tokens.input += tokens.input;
        this.metrics.modelUsage[modelKey].tokens.output += tokens.output;
        this.metrics.modelUsage[modelKey].totalTime += responseTime;

        // Update daily usage
        const today = new Date().toISOString().split('T')[0];
        if (!this.metrics.dailyUsage[today]) {
            this.metrics.dailyUsage[today] = {
                requests: 0,
                tokens: { input: 0, output: 0 }
            };
        }
        
        this.metrics.dailyUsage[today].requests++;
        this.metrics.dailyUsage[today].tokens.input += tokens.input;
        this.metrics.dailyUsage[today].tokens.output += tokens.output;

        // Update error rate
        if (isError) {
            this.metrics.errorRate = 
                (this.metrics.errorRate * (this.metrics.totalRequests - 1) + 1) / 
                this.metrics.totalRequests;
        } else {
            this.metrics.errorRate = 
                (this.metrics.errorRate * (this.metrics.totalRequests - 1)) / 
                this.metrics.totalRequests;
        }

        this.metrics.lastActivity = Date.now();
        this.saveMetrics();
    }

    getMetrics(): UsageMetrics {
        return { ...this.metrics };
    }

    getTopModels(limit: number = 5): Array<{
        model: string;
        requests: number;
        avgTokens: number;
        avgResponseTime: number;
    }> {
        return Object.entries(this.metrics.modelUsage)
            .map(([model, usage]) => ({
                model,
                requests: usage.requests,
                avgTokens: (usage.tokens.input + usage.tokens.output) / usage.requests,
                avgResponseTime: usage.totalTime / usage.requests
            }))
            .sort((a, b) => b.requests - a.requests)
            .slice(0, limit);
    }

    getDailyStats(days: number = 7): Array<{
        date: string;
        requests: number;
        tokens: { input: number; output: number };
    }> {
        const dates = [];
        const today = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            dates.push({
                date: dateStr,
                requests: this.metrics.dailyUsage[dateStr]?.requests || 0,
                tokens: {
                    input: this.metrics.dailyUsage[dateStr]?.tokens.input || 0,
                    output: this.metrics.dailyUsage[dateStr]?.tokens.output || 0
                }
            });
        }
        
        return dates;
    }

    reset(): void {
        this.metrics = {
            totalRequests: 0,
            totalTokens: { input: 0, output: 0 },
            averageResponseTime: 0,
            modelUsage: {},
            dailyUsage: {},
            errorRate: 0,
            lastActivity: Date.now()
        };
        this.responseTimes = [];
        this.sessionStart = Date.now();
        this.saveMetrics();
    }

    getSessionDuration(): number {
        return Date.now() - this.sessionStart;
    }

    getEfficiencyScore(): number {
        if (this.metrics.totalRequests === 0) return 0;
        
        const totalTokens = this.metrics.totalTokens.input + this.metrics.totalTokens.output;
        const avgTokensPerRequest = totalTokens / this.metrics.totalRequests;
        const avgResponseTime = this.metrics.averageResponseTime;
        
        // Score based on tokens per request and response time
        const tokenScore = Math.min(avgTokensPerRequest / 1000, 1) * 50;
        const timeScore = Math.max(0, 100 - (avgResponseTime / 1000) * 10);
        const errorPenalty = this.metrics.errorRate * 100;
        
        return Math.max(0, tokenScore + timeScore - errorPenalty);
    }
}