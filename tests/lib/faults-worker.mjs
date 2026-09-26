// A worker thread that runs U01's no-overlap check on a share of the poses (`workerData`: [label, state] pairs) and posts back the faults.
import { parentPort, workerData } from 'node:worker_threads';
import { faultsNow } from '../../units/01-neuron/unit/place.ts';

parentPort.postMessage(workerData.flatMap(([at, s]) => faultsNow(s, false).map((f) => `${at}: ${f}`)));
