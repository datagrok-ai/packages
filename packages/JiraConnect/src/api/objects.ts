
export class AuthCreds {
    userName: string;
    authKey: string;

    constructor(userName: string, authKey: string) {
        this.authKey = authKey;
        this.userName = userName;
    }
}

export interface Project {
    expand: string;
    self: string;
    id: string;
    key: string;
    name: string;
    avatarUrls: Record<string, string>;
    projectTypeKey: string;
    simplified: boolean;
    style: string;
    isPrivate: boolean;
    properties: Record<string, any>;
}

export interface JiraIssue {
    expand: string;
    id: string;
    self: string;
    key: string;
    fields: Record<string, any>;
}

export interface JiraIssuesList {
    maxResults: number;
    startAt: number;
    total:number;
    issues: JiraIssue[];
} 

export interface ErrorMessageResponse {
    errorMessages: string
}