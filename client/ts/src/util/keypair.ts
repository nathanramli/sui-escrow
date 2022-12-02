import { join, resolve } from 'path';
import fs from 'fs';
import nacl from 'tweetnacl';
import { Ed25519Keypair } from '@mysten/sui.js';

export const loadKeypair = async (name: string, createWhenNotExist = false) => {
    const keysPath = resolve(__dirname, '../keys');

    if (!fs.existsSync(keysPath)) fs.mkdirSync(keysPath);

    if (fs.existsSync(join(keysPath, `${name}.json`))) {
        const secretKey = new Uint8Array(
            JSON.parse(fs.readFileSync(join(keysPath, `${name}.json`), 'utf-8'))
        );

        return Ed25519Keypair.fromSecretKey(secretKey);
    } else {
        const keypair = nacl.sign.keyPair();

        if (createWhenNotExist) {
            fs.writeFileSync(
                join(keysPath, `${name}.json`),
                JSON.stringify(Array.from(keypair.secretKey))
            );
        } else {
            throw new Error('keypair is not exist');
        }

        return Ed25519Keypair.fromSecretKey(keypair.secretKey);
    }
};
