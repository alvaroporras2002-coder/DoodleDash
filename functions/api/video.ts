import {handleVideo,type VideoEnv} from '../../server/video';
export const onRequest=({request,env}:{request:Request;env:VideoEnv})=>handleVideo(request,env);
