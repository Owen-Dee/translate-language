export enum PipeStatus {
    WAIT,
    PROCESSING,
    FINISH,
    ERROR,
    SERVER_ERROR,
}

export interface IFile extends File {
    status: PipeStatus,
    lastModifiedDate: string;
    size: number;
    type: string;
    webkitRelativePath: string;
    id: string;
    values?: {
        [key: string]: string
    }
}
