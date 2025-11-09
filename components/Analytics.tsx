import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { TrendingUpIcon, TrendingDownIcon, ClockIcon, UsersIcon } from "lucide-react";

interface MetricCard {
    title: string;
    value: string;
    change: number;
    trend: 'up' | 'down';
    description: string;
}

const metrics: MetricCard[] = [
    {
        title: 'Allocation Efficiency',
        value: '94.2%',
        change: 2.4,
        trend: 'up',
        description: 'Beds allocated optimally'
    },
    {
        title: 'Average Wait Time',
        value: '12 min',
        change: -18,
        trend: 'down',
        description: 'Patient wait for bed assignment'
    },
    {
        title: 'Patient Throughput',
        value: '156/day',
        change: 8.3,
        trend: 'up',
        description: 'Daily patient admissions'
    },
    {
        title: 'Resource Utilization',
        value: '87.5%',
        change: 5.1,
        trend: 'up',
        description: 'Overall facility usage'
    }
];

const swarmMetrics = [
    { label: 'Algorithm Iterations', value: 1247, max: 2000 },
    { label: 'Convergence Speed', value: 89, max: 100 },
    { label: 'Solution Quality', value: 96, max: 100 },
    { label: 'Resource Optimization', value: 91, max: 100 }
];

export function Analytics() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">System Analytics</h2>
                <p className="text-muted-foreground">Performance metrics and swarm algorithm insights</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((metric, index) => (
                    <Card key={index}>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {metric.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-2xl font-bold">{metric.value}</span>
                                <div className={`flex items-center space-x-1 text-sm ${
                                    metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {metric.trend === 'up' ? (
                                        <TrendingUpIcon className="h-4 w-4" />
                                    ) : (
                                        <TrendingDownIcon className="h-4 w-4" />
                                    )}
                                    <span>{Math.abs(metric.change)}%</span>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">{metric.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Swarm Algorithm Performance */}
                <Card>
                    <CardHeader>
                        <CardTitle>Swarm Algorithm Performance</CardTitle>
                        <CardDescription>
                            Real-time metrics from the optimization engine
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {swarmMetrics.map((metric, index) => (
                            <div key={index} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">{metric.label}</span>
                                    <span className="text-sm text-muted-foreground">
                    {metric.value}/{metric.max}
                  </span>
                                </div>
                                <Progress value={(metric.value / metric.max) * 100} className="h-2" />
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>
                            Latest bed allocations and system events
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                {
                                    action: 'Bed allocated',
                                    details: 'ICU-A12 assigned to Emergency patient',
                                    time: '2 minutes ago',
                                    type: 'allocation'
                                },
                                {
                                    action: 'Optimization completed',
                                    details: 'Ward B layout optimized for efficiency',
                                    time: '8 minutes ago',
                                    type: 'optimization'
                                },
                                {
                                    action: 'New partner added',
                                    details: 'Metro Emergency Center joined network',
                                    time: '1 hour ago',
                                    type: 'partnership'
                                },
                                {
                                    action: 'Bed released',
                                    details: 'General-C05 now available',
                                    time: '2 hours ago',
                                    type: 'release'
                                },
                                {
                                    action: 'Algorithm updated',
                                    details: 'Swarm parameters optimized',
                                    time: '4 hours ago',
                                    type: 'system'
                                }
                            ].map((activity, index) => (
                                <div key={index} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                                    <div className="mt-1">
                                        <ClockIcon className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium">{activity.action}</p>

                                        </div>
                                        <p className="text-xs text-muted-foreground">{activity.details}</p>
                                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}