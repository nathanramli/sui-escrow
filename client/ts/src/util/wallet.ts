import { resolve } from 'path';
import fs from 'fs';
import { fromExportedKeypair, fromB64, toB64 } from '@mysten/sui.js';
import type { ExportedKeypair } from '@mysten/sui.js';

const SUI_CONFIG_PATH = `${process.env.HOME}/.sui/sui_config/`;

export const localWallet = async (
    account_index: number,
    configPath = SUI_CONFIG_PATH
) => {
    const keysPath = resolve(configPath, './sui.keystore');

    if (!fs.existsSync(keysPath)) throw new Error('Local wallet is not exist');

    const keystoreList = JSON.parse(fs.readFileSync(keysPath, 'utf-8'));

    if (keystoreList[account_index]) {
        const decoded_array_buffer = fromB64(keystoreList[account_index]);
        const decoded_array = Array.from(decoded_array_buffer);
        const flag = decoded_array.shift();

        const privatekey = Uint8Array.from(decoded_array);
        switch (flag) {
            case 0:
                return fromExportedKeypair({
                    schema: 'ED25519',
                    privateKey: toB64(privatekey),
                } as ExportedKeypair);
            case 1:
                return fromExportedKeypair({
                    schema: 'Secp256k1',
                    privateKey: toB64(privatekey),
                } as ExportedKeypair);
            default:
                throw new Error(`Invalid keypair schema \`0x0${flag}\``);
        }
    } else {
        throw new Error('The specified account does not exist');
    }
};
