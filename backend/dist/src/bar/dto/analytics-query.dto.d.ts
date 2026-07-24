export declare enum DatePreset {
    WEEK = "WEEK",
    MONTH = "MONTH",
    YEAR = "YEAR",
    CUSTOM = "CUSTOM"
}
export declare class AnalyticsQueryDto {
    preset: DatePreset;
    startDate?: string;
    endDate?: string;
}
