
import * as constants from './constants';
import { _package } from '../package';

interface JiraCredsData {
    authKey: string;
    userName: string;
    host: string;
}

export async function getJiraCreds(): Promise<JiraCredsData> {
    
    let credentialsParams = (await _package.getCredentials()).parameters;
    let authKey = credentialsParams[constants.AUTH_KEY];
    let userName = credentialsParams[constants.USERNAME];
    let host = credentialsParams[constants.HOST_NAME];
    return { authKey: authKey, userName: userName, host: host };
}