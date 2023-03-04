import { join, resolve } from 'path';
import fs from 'fs';
import {
    Ed25519Keypair,
    Secp256k1Keypair,
    fromExportedKeypair,
} from '@mysten/sui.js';
import type { SignatureScheme } from '@mysten/sui.js';

export const loadKeypair = async (
    name: string,
    schema: SignatureScheme = 'ED25519',
    createWhenNotExist = false
) => {
    const keysPath = resolve(__dirname, '../keys');

    if (!fs.existsSync(keysPath)) fs.mkdirSync(keysPath);

    if (fs.existsSync(join(keysPath, `${name}.json`))) {
        const exportedKeypair = JSON.parse(
            fs.readFileSync(join(keysPath, `${name}.json`), 'utf-8')
        );

        return fromExportedKeypair(exportedKeypair);
    } else {
        let keypair: Ed25519Keypair | Secp256k1Keypair;
        switch (schema) {
            case 'ED25519':
                keypair = Ed25519Keypair.generate();
                break;
            case 'Secp256k1':
                keypair = Secp256k1Keypair.generate();
            default:
                throw new Error(`Invalid keypair schema ${schema}`);
        }
        const exportKeypair = keypair.export();
        if (createWhenNotExist) {
            fs.writeFileSync(
                join(keysPath, `${name}.json`),
                JSON.stringify(exportKeypair)
            );
        } else {
            throw new Error('keypair is not exist');
        }

        return fromExportedKeypair(exportKeypair);
    }
};
