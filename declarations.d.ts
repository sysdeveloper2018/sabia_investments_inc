declare module 'heic2any' {
    function heic2any(options: {
        blob: Blob | File;
        toType?: string;
        quality?: number;
        gifInterval?: number;
    }): Promise<Blob | Blob[]>;
    export default heic2any;
}