import {IFile, PipeStatus} from '../types';

export function filterFiles(files: IFile[]) {
    return Array.from(files).filter((file, index) => {
        file.status = PipeStatus.WAIT;
        file.id = String(index);
        return file.name.endsWith('.json');
    });
}
