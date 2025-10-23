export type NewsPlatform = {
    "address": "9pRU9UFJctN6H1b1hY3GCkVwK5b3ESC7ZqBDZ8thooN4";
    "metadata": {
        "name": "newsPlatform";
        "version": "0.1.0";
        "spec": "0.1.0";
        "description": "Created with Anchor";
    };
    "instructions": [
        {
            "name": "addAuthority";
            "docs": [
                "Add a whitelisted oracle authority"
            ];
            "discriminator": [
                229,
                9,
                106,
                73,
                91,
                213,
                109,
                183
            ];
            "accounts": [
                {
                    "name": "whitelist";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
                                "value": [
                                    119,
                                    104,
                                    105,
                                    116,
                                    101,
                                    108,
                                    105,
                                    115,
                                    116
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "authority";
                            }
                        ];
                    };
                },
                {
                    "name": "oracle";
                },
                {
                    "name": "admin";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "authority";
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "authority";
                    "type": "pubkey";
                }
            ];
        },
        {
            "name": "awardTrophy";
            "docs": [
                "Award a trophy to a user"
            ];
            "discriminator": [
                65,
                149,
                0,
                95,
                225,
                132,
                103,
                234
            ];
            "accounts": [
                {
                    "name": "profile";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
                                "value": [
                                    112,
                                    114,
                                    111,
                                    102,
                                    105,
                                    108,
                                    101
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "user";
                            }
                        ];
                    };
                },
                {
                    "name": "user";
                },
                {
                    "name": "admin";
                    "signer": true;
                }
            ];
            "args": [];
        },
        {
            "name": "buy";
            "docs": [
                "Buy tokens from the bonding curve with automatic delegation"
            ];
            "discriminator": [
                102,
                6,
                61,
                18,
                1,
                218,
                235,
                234
            ];
            "accounts": [
                {
                    "name": "market";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
                                "value": [
                                    109,
                                    97,
                                    114,
                                    107,
                                    101,
                                    116
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "newsAccount";
                            }
                        ];
                    };
                },
                {
                    "name": "mint";
                    "writable": true;
                },
                {
                    "name": "newsAccount";
                    "docs": [
                        "News account for minting authority"
                    ];
                },
                {
                    "name": "buyer";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "buyerTokenAccount";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account";
                                "path": "buyer";
                            },
                            {
                                "kind": "const";
                                "value": [
                                    6,
                                    221,
                                    246,
                                    225,
                                    215,
                                    101,
                                    161,
                                    147,
                                    217,
                                    203,
                                    225,
                                    70,
                                    206,
                                    235,
                                    121,
                                    172,
                                    28,
                                    180,
                                    133,
                                    237,
                                    95,
                                    91,
                                    55,
                                    145,
                                    58,
                                    140,
                                    245,
                                    133,
                                    126,
                                    255,
                                    0,
                                    169
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "mint";
                            }
                        ];
                        "program": {
                            "kind": "const";
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ];
                        };
                    };
                },
                {
                    "name": "tokenProgram";
                    "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
                },
                {
                    "name": "associatedTokenProgram";
                    "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "amount";
                    "type": "u64";
                }
            ];
        },
        {
            "name": "claimStakingFees";
            "docs": [
                "Claim accumulated staking fees"
            ];
            "discriminator": [
                41,
                122,
                96,
                254,
                10,
                172,
                37,
                75
            ];
            "accounts": [
                {
                    "name": "market";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
                                "value": [
                                    109,
                                    97,
                                    114,
                                    107,
                                    101,
                                    116
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "newsAccount";
                            }
                        ];
                    };
                },
                {
                    "name": "newsAccount";
                },
                {
                    "name": "author";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [];
        },
        {
            "name": "commit";
            "docs": [
                "Commit rollup state back to main chain"
            ];
            "discriminator": [
                223,
                140,
                142,
                165,
                229,
                208,
                156,
                74
            ];
            "accounts": [
                {
                    "name": "market";
                    "writable": true;
                },
                {
                    "name": "rollupAuthority";
                    "signer": true;
                }
            ];
            "args": [
                {
                    "name": "newSupply";
                    "type": "u64";
                },
                {
                    "name": "newReserves";
                    "type": "u64";
                }
            ];
        },
        {
            "name": "delegate";
            "docs": [
                "Delegate the market to the delegation program",
                "IMPORTANT: Set specific validator based on ER"
            ];
            "discriminator": [
                90,
                147,
                75,
                178,
                85,
                88,
                4,
                137
            ];
            "accounts": [
                {
                    "name": "payer";
                    "signer": true;
                },
                {
                    "name": "newsAccount";
                    "docs": [
                        "The news account for market seeds"
                    ];
                },
                {
                    "name": "market";
                    "docs": [
                        "The market pda to delegate"
                    ];
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
                                "value": [
                                    109,
                                    97,
                                    114,
                                    107,
                                    101,
                                    116
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "newsAccount";
                            }
                        ];
                    };
                }
            ];
            "args": [];
        },
        {
            "name": "getAllNewsTokens";
            "docs": [
                "Get all news tokens with optional filtering and pagination",
                "This is a view function that doesn't modify state"
            ];
            "discriminator": [
                32,
                132,
                53,
                119,
                89,
                118,
                103,
                128
            ];
            "accounts": [
                {
                    "name": "requester";
                    "docs": [
                        "The account requesting the news tokens"
                    ];
                    "signer": true;
                }
            ];
            "args": [
                {
                    "name": "offset";
                    "type": "u32";
                },
                {
                    "name": "limit";
                    "type": "u32";
                }
            ];
        },
        {
            "name": "getCurrentPrice";
            "docs": [
                "Get the current price for buying 1 token"
            ];
            "discriminator": [
                82,
                101,
                90,
                124,
                192,
                68,
                89,
                159
            ];
            "accounts": [
                {
                    "name": "market";
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
                                "value": [
                                    109,
                                    97,
                                    114,
                                    107,
                                    101,
                                    116
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "newsAccount";
                            }
                        ];
                    };
                },
                {
                    "name": "newsAccount";
                }
            ];
            "args": [];
            "returns": "u64";
        },
        {
            "name": "getNewsByAuthor";
            "docs": [
                "Get news tokens by a specific author",
                "This function returns the news account data for a specific author and nonce"
            ];
            "discriminator": [
                73,
                145,
                196,
                198,
                138,
                170,
                75,
                106
            ];
            "accounts": [
                {
                    "name": "newsAccount";
                    "docs": [
                        "The news account to retrieve"
                    ];
                },
                {
                    "name": "requester";
                    "docs": [
                        "The account requesting the news token data"
                    ];
                    "signer": true;
                }
            ];
            "args": [];
        },
        {
            "name": "initializeOracle";
            "docs": [
                "Initialize the oracle with whitelisted authorities"
            ];
            "discriminator": [
                144,
                223,
                131,
                120,
                196,
                253,
                181,
                99
            ];
            "accounts": [
                {
                    "name": "oracle";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
                                "value": [
                                    111,
                                    114,
                                    97,
                                    99,
                                    108,
                                    101
                                ];
                            }
                        ];
                    };
                },
                {
                    "name": "admin";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [];
        },
        {
            "name": "initializeProfile";
            "docs": [
                "Initialize a user profile for tracking PnL and stats"
            ];
            "discriminator": [
                32,
                145,
                77,
                213,
                58,
                39,
                251,
                234
            ];
            "accounts": [
                {
                    "name": "profile";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
                                "value": [
                                    112,
                                    114,
                                    111,
                                    102,
                                    105,
                                    108,
                                    101
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "user";
                            }
                        ];
                    };
                },
                {
                    "name": "user";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [];
        },
        {
            "name": "initializeSeason";
            "docs": [
                "Initialize a new season"
            ];
            "discriminator": [
                48,
                218,
                111,
                51,
                235,
                207,
                4,
                119
            ];
            "accounts": [
                {
                    "name": "season";
                    "writable": true;
                },
                {
                    "name": "admin";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "seasonId";
                    "type": "u64";
                }
            ];
        },
        {
            "name": "publishNews";
            "docs": [
                "Publishes a new news story and creates a tradable token"
            ];
            "discriminator": [
                210,
                212,
                54,
                71,
                207,
                75,
                130,
                231
            ];
            "accounts": [
                {
                    "name": "newsAccount";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
                                "value": [
                                    110,
                                    101,
                                    119,
                                    115
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "author";
                            },
                            {
                                "kind": "arg";
                                "path": "nonce";
                            }
                        ];
                    };
                },
                {
                    "name": "mint";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
                                "value": [
                                    109,
                                    105,
                                    110,
                                    116
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "newsAccount";
                            }
                        ];
                    };
                },
                {
                    "name": "metadata";
                    "writable": true;
                },
                {
                    "name": "author";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "authorTokenAccount";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account";
                                "path": "author";
                            },
                            {
                                "kind": "const";
                                "value": [
                                    6,
                                    221,
                                    246,
                                    225,
                                    215,
                                    101,
                                    161,
                                    147,
                                    217,
                                    203,
                                    225,
                                    70,
                                    206,
                                    235,
                                    121,
                                    172,
                                    28,
                                    180,
                                    133,
                                    237,
                                    95,
                                    91,
                                    55,
                                    145,
                                    58,
                                    140,
                                    245,
                                    133,
                                    126,
                                    255,
                                    0,
                                    169
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "mint";
                            }
                        ];
                        "program": {
                            "kind": "const";
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ];
                        };
                    };
                },
                {
                    "name": "market";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
                                "value": [
                                    109,
                                    97,
                                    114,
                                    107,
                                    101,
                                    116
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "newsAccount";
                            }
                        ];
                    };
                },
                {
                    "name": "tokenProgram";
                    "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
                },
                {
                    "name": "associatedTokenProgram";
                    "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
                },
                {
                    "name": "metadataProgram";
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                },
                {
                    "name": "rent";
                    "address": "SysvarRent111111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "headline";
                    "type": "string";
                },
                {
                    "name": "arweaveLink";
                    "type": "string";
                },
                {
                    "name": "initialSupply";
                    "type": "u64";
                },
                {
                    "name": "basePrice";
                    "type": "u64";
                },
                {
                    "name": "nonce";
                    "type": "u64";
                }
            ];
        },
        {
            "name": "recordTradePnl";
            "docs": [
                "Record trade PnL for a user"
            ];
            "discriminator": [
                46,
                223,
                161,
                64,
                215,
                41,
                219,
                241
            ];
            "accounts": [
                {
                    "name": "position";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
                                "value": [
                                    112,
                                    111,
                                    115,
                                    105,
                                    116,
                                    105,
                                    111,
                                    110
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "user";
                            },
                            {
                                "kind": "account";
                                "path": "market";
                            }
                        ];
                    };
                },
                {
                    "name": "profile";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
                                "value": [
                                    112,
                                    114,
                                    111,
                                    102,
                                    105,
                                    108,
                                    101
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "user";
                            }
                        ];
                    };
                },
                {
                    "name": "season";
                    "writable": true;
                },
                {
                    "name": "market";
                    "writable": true;
                },
                {
                    "name": "user";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "tradeType";
                    "type": {
                        "defined": {
                            "name": "tradeType";
                        };
                    };
                },
                {
                    "name": "amount";
                    "type": "u64";
                },
                {
                    "name": "price";
                    "type": "u64";
                }
            ];
        },
        {
            "name": "resetSeasonPnl";
            "docs": [
                "Reset season PnL for a user (admin only)"
            ];
            "discriminator": [
                218,
                241,
                207,
                119,
                226,
                77,
                183,
                12
            ];
            "accounts": [
                {
                    "name": "profile";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
                                "value": [
                                    112,
                                    114,
                                    111,
                                    102,
                                    105,
                                    108,
                                    101
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "user";
                            }
                        ];
                    };
                },
                {
                    "name": "user";
                },
                {
                    "name": "admin";
                    "signer": true;
                }
            ];
            "args": [];
        },
        {
            "name": "sell";
            "docs": [
                "Sell tokens back to the bonding curve with commit recommendations"
            ];
            "discriminator": [
                51,
                230,
                133,
                164,
                1,
                127,
                131,
                173
            ];
            "accounts": [
                {
                    "name": "market";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
                                "value": [
                                    109,
                                    97,
                                    114,
                                    107,
                                    101,
                                    116
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "newsAccount";
                            }
                        ];
                    };
                },
                {
                    "name": "mint";
                    "writable": true;
                },
                {
                    "name": "newsAccount";
                    "docs": [
                        "News account for minting authority"
                    ];
                },
                {
                    "name": "buyer";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "buyerTokenAccount";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account";
                                "path": "buyer";
                            },
                            {
                                "kind": "const";
                                "value": [
                                    6,
                                    221,
                                    246,
                                    225,
                                    215,
                                    101,
                                    161,
                                    147,
                                    217,
                                    203,
                                    225,
                                    70,
                                    206,
                                    235,
                                    121,
                                    172,
                                    28,
                                    180,
                                    133,
                                    237,
                                    95,
                                    91,
                                    55,
                                    145,
                                    58,
                                    140,
                                    245,
                                    133,
                                    126,
                                    255,
                                    0,
                                    169
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "mint";
                            }
                        ];
                        "program": {
                            "kind": "const";
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ];
                        };
                    };
                },
                {
                    "name": "tokenProgram";
                    "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
                },
                {
                    "name": "associatedTokenProgram";
                    "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "amount";
                    "type": "u64";
                }
            ];
        },
        {
            "name": "stakeAuthorTokens";
            "docs": [
                "Stake author tokens to earn trading fees"
            ];
            "discriminator": [
                233,
                45,
                32,
                33,
                120,
                22,
                190,
                188
            ];
            "accounts": [
                {
                    "name": "market";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
                                "value": [
                                    109,
                                    97,
                                    114,
                                    107,
                                    101,
                                    116
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "newsAccount";
                            }
                        ];
                    };
                },
                {
                    "name": "newsAccount";
                },
                {
                    "name": "mint";
                    "writable": true;
                },
                {
                    "name": "author";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "authorTokenAccount";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account";
                                "path": "author";
                            },
                            {
                                "kind": "const";
                                "value": [
                                    6,
                                    221,
                                    246,
                                    225,
                                    215,
                                    101,
                                    161,
                                    147,
                                    217,
                                    203,
                                    225,
                                    70,
                                    206,
                                    235,
                                    121,
                                    172,
                                    28,
                                    180,
                                    133,
                                    237,
                                    95,
                                    91,
                                    55,
                                    145,
                                    58,
                                    140,
                                    245,
                                    133,
                                    126,
                                    255,
                                    0,
                                    169
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "mint";
                            }
                        ];
                        "program": {
                            "kind": "const";
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ];
                        };
                    };
                },
                {
                    "name": "tokenProgram";
                    "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
                },
                {
                    "name": "associatedTokenProgram";
                    "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "amount";
                    "type": "u64";
                }
            ];
        },
        {
            "name": "undelegate";
            "docs": [
                "Undelegate the market from the delegation program"
            ];
            "discriminator": [
                131,
                148,
                180,
                198,
                91,
                104,
                42,
                238
            ];
            "accounts": [
                {
                    "name": "payer";
                    "signer": true;
                },
                {
                    "name": "market";
                    "docs": [
                        "CHECK The market pda to undelegate"
                    ];
                    "writable": true;
                }
            ];
            "args": [];
        },
        {
            "name": "unstakeAuthorTokens";
            "docs": [
                "Unstake author tokens"
            ];
            "discriminator": [
                11,
                19,
                226,
                239,
                6,
                77,
                174,
                215
            ];
            "accounts": [
                {
                    "name": "market";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
                                "value": [
                                    109,
                                    97,
                                    114,
                                    107,
                                    101,
                                    116
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "newsAccount";
                            }
                        ];
                    };
                },
                {
                    "name": "newsAccount";
                },
                {
                    "name": "mint";
                    "writable": true;
                },
                {
                    "name": "author";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "authorTokenAccount";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account";
                                "path": "author";
                            },
                            {
                                "kind": "const";
                                "value": [
                                    6,
                                    221,
                                    246,
                                    225,
                                    215,
                                    101,
                                    161,
                                    147,
                                    217,
                                    203,
                                    225,
                                    70,
                                    206,
                                    235,
                                    121,
                                    172,
                                    28,
                                    180,
                                    133,
                                    237,
                                    95,
                                    91,
                                    55,
                                    145,
                                    58,
                                    140,
                                    245,
                                    133,
                                    126,
                                    255,
                                    0,
                                    169
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "mint";
                            }
                        ];
                        "program": {
                            "kind": "const";
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ];
                        };
                    };
                },
                {
                    "name": "tokenProgram";
                    "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
                },
                {
                    "name": "associatedTokenProgram";
                    "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "amount";
                    "type": "u64";
                }
            ];
        },
        {
            "name": "updateSummaryLink";
            "docs": [
                "Update the AI summary link for a news token"
            ];
            "discriminator": [
                92,
                42,
                122,
                247,
                116,
                160,
                240,
                0
            ];
            "accounts": [
                {
                    "name": "newsAccount";
                    "writable": true;
                },
                {
                    "name": "whitelist";
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
                                "value": [
                                    119,
                                    104,
                                    105,
                                    116,
                                    101,
                                    108,
                                    105,
                                    115,
                                    116
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "oracleAuthority";
                            }
                        ];
                    };
                },
                {
                    "name": "oracleAuthority";
                    "signer": true;
                }
            ];
            "args": [
                {
                    "name": "summaryLink";
                    "type": "string";
                }
            ];
        }
    ];
    "accounts": [
        {
            "name": "market";
            "discriminator": [
                219,
                190,
                213,
                55,
                0,
                227,
                198,
                154
            ];
        },
        {
            "name": "newsAccount";
            "discriminator": [
                137,
                119,
                255,
                157,
                133,
                133,
                89,
                191
            ];
        },
        {
            "name": "oracle";
            "discriminator": [
                139,
                194,
                131,
                179,
                140,
                179,
                229,
                244
            ];
        },
        {
            "name": "profile";
            "discriminator": [
                184,
                101,
                165,
                188,
                95,
                63,
                127,
                188
            ];
        },
        {
            "name": "season";
            "discriminator": [
                76,
                67,
                93,
                156,
                180,
                157,
                248,
                47
            ];
        },
        {
            "name": "tradePosition";
            "discriminator": [
                37,
                143,
                119,
                76,
                200,
                164,
                122,
                202
            ];
        },
        {
            "name": "whitelistedAuthority";
            "discriminator": [
                166,
                187,
                126,
                67,
                19,
                108,
                184,
                141
            ];
        }
    ];
    "events": [
        {
            "name": "currentPriceRetrieved";
            "discriminator": [
                172,
                231,
                7,
                52,
                84,
                76,
                184,
                67
            ];
        },
        {
            "name": "feesClaimed";
            "discriminator": [
                22,
                104,
                110,
                222,
                38,
                157,
                14,
                62
            ];
        },
        {
            "name": "marketAutoDelegated";
            "discriminator": [
                193,
                112,
                102,
                53,
                162,
                96,
                115,
                225
            ];
        },
        {
            "name": "marketDelegated";
            "discriminator": [
                222,
                133,
                6,
                58,
                71,
                21,
                95,
                219
            ];
        },
        {
            "name": "marketUndelegated";
            "discriminator": [
                88,
                59,
                175,
                236,
                157,
                99,
                0,
                14
            ];
        },
        {
            "name": "newsPublished";
            "discriminator": [
                196,
                175,
                152,
                128,
                114,
                192,
                216,
                23
            ];
        },
        {
            "name": "newsTokenRetrieved";
            "discriminator": [
                242,
                218,
                182,
                91,
                19,
                238,
                37,
                106
            ];
        },
        {
            "name": "newsTokensRequested";
            "discriminator": [
                155,
                137,
                222,
                122,
                132,
                166,
                174,
                181
            ];
        },
        {
            "name": "profileInitialized";
            "discriminator": [
                1,
                31,
                122,
                19,
                193,
                205,
                23,
                27
            ];
        },
        {
            "name": "rollupCommitted";
            "discriminator": [
                243,
                229,
                84,
                172,
                201,
                71,
                172,
                163
            ];
        },
        {
            "name": "seasonStarted";
            "discriminator": [
                13,
                80,
                245,
                91,
                31,
                220,
                154,
                47
            ];
        },
        {
            "name": "stateCommitRecommended";
            "discriminator": [
                232,
                228,
                30,
                105,
                209,
                183,
                40,
                173
            ];
        },
        {
            "name": "summaryUpdated";
            "discriminator": [
                250,
                47,
                192,
                20,
                242,
                11,
                24,
                141
            ];
        },
        {
            "name": "tokensPurchased";
            "discriminator": [
                214,
                119,
                105,
                186,
                114,
                205,
                228,
                181
            ];
        },
        {
            "name": "tokensSold";
            "discriminator": [
                217,
                83,
                68,
                137,
                134,
                225,
                94,
                45
            ];
        },
        {
            "name": "tokensStaked";
            "discriminator": [
                220,
                130,
                145,
                142,
                109,
                123,
                38,
                100
            ];
        },
        {
            "name": "tokensUnstaked";
            "discriminator": [
                137,
                203,
                131,
                80,
                135,
                107,
                181,
                150
            ];
        },
        {
            "name": "tradeRecorded";
            "discriminator": [
                153,
                142,
                127,
                129,
                64,
                214,
                134,
                138
            ];
        },
        {
            "name": "trophyAwarded";
            "discriminator": [
                221,
                236,
                21,
                237,
                108,
                172,
                89,
                52
            ];
        }
    ];
    "errors": [
        {
            "code": 6000;
            "name": "headlineTooLong";
            "msg": "Headline exceeds maximum length of 200 characters";
        },
        {
            "code": 6001;
            "name": "linkTooLong";
            "msg": "Link exceeds maximum length of 200 characters";
        },
        {
            "code": 6002;
            "name": "insufficientFunds";
            "msg": "Insufficient funds for purchase";
        },
        {
            "code": 6003;
            "name": "insufficientSupply";
            "msg": "Insufficient token supply";
        },
        {
            "code": 6004;
            "name": "insufficientReserves";
            "msg": "Insufficient SOL reserves in market";
        },
        {
            "code": 6005;
            "name": "alreadyDelegated";
            "msg": "Market is already delegated to a rollup";
        },
        {
            "code": 6006;
            "name": "notDelegated";
            "msg": "Market is not currently delegated";
        },
        {
            "code": 6007;
            "name": "unauthorizedRollup";
            "msg": "Unauthorized rollup authority";
        },
        {
            "code": 6008;
            "name": "unauthorizedOracle";
            "msg": "Unauthorized oracle authority";
        },
        {
            "code": 6009;
            "name": "arithmeticOverflow";
            "msg": "Arithmetic overflow in bonding curve calculation";
        },
        {
            "code": 6010;
            "name": "constraintSeeds";
            "msg": "A seeds constraint was violated";
        },
        {
            "code": 6011;
            "name": "seasonNotActive";
            "msg": "Season is not currently active";
        },
        {
            "code": 6012;
            "name": "seasonNotEnded";
            "msg": "Season has not ended yet";
        },
        {
            "code": 6013;
            "name": "seasonAlreadyExists";
            "msg": "Season already exists";
        }
    ];
    "types": [
        {
            "name": "currentPriceRetrieved";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "market";
                        "type": "pubkey";
                    },
                    {
                        "name": "price";
                        "type": "u64";
                    },
                    {
                        "name": "circulatingSupply";
                        "type": "u64";
                    }
                ];
            };
        },
        {
            "name": "curveType";
            "type": {
                "kind": "enum";
                "variants": [
                    {
                        "name": "linear";
                    },
                    {
                        "name": "exponential";
                    },
                    {
                        "name": "logarithmic";
                    }
                ];
            };
        },
        {
            "name": "feesClaimed";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "author";
                        "type": "pubkey";
                    },
                    {
                        "name": "market";
                        "type": "pubkey";
                    },
                    {
                        "name": "amount";
                        "type": "u64";
                    }
                ];
            };
        },
        {
            "name": "market";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "newsAccount";
                        "type": "pubkey";
                    },
                    {
                        "name": "mint";
                        "type": "pubkey";
                    },
                    {
                        "name": "curveType";
                        "type": {
                            "defined": {
                                "name": "curveType";
                            };
                        };
                    },
                    {
                        "name": "circulatingSupply";
                        "type": "u64";
                    },
                    {
                        "name": "initialSupply";
                        "type": "u64";
                    },
                    {
                        "name": "basePrice";
                        "type": "u64";
                    },
                    {
                        "name": "solReserves";
                        "type": "u64";
                    },
                    {
                        "name": "totalVolume";
                        "type": "u64";
                    },
                    {
                        "name": "isDelegated";
                        "type": "bool";
                    },
                    {
                        "name": "rollupAuthority";
                        "type": {
                            "option": "pubkey";
                        };
                    },
                    {
                        "name": "stakedAuthorTokens";
                        "type": "u64";
                    },
                    {
                        "name": "accumulatedFees";
                        "type": "u64";
                    },
                    {
                        "name": "author";
                        "type": "pubkey";
                    },
                    {
                        "name": "bump";
                        "type": "u8";
                    }
                ];
            };
        },
        {
            "name": "marketAutoDelegated";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "market";
                        "type": "pubkey";
                    },
                    {
                        "name": "rollupAuthority";
                        "type": "pubkey";
                    },
                    {
                        "name": "trigger";
                        "type": "string";
                    }
                ];
            };
        },
        {
            "name": "marketDelegated";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "market";
                        "type": "pubkey";
                    },
                    {
                        "name": "rollupAuthority";
                        "type": "pubkey";
                    }
                ];
            };
        },
        {
            "name": "marketUndelegated";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "market";
                        "type": "pubkey";
                    }
                ];
            };
        },
        {
            "name": "newsAccount";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "authority";
                        "type": "pubkey";
                    },
                    {
                        "name": "headline";
                        "type": "string";
                    },
                    {
                        "name": "arweaveLink";
                        "type": "string";
                    },
                    {
                        "name": "summaryLink";
                        "type": "string";
                    },
                    {
                        "name": "mint";
                        "type": "pubkey";
                    },
                    {
                        "name": "publishedAt";
                        "type": "i64";
                    },
                    {
                        "name": "nonce";
                        "type": "u64";
                    },
                    {
                        "name": "bump";
                        "type": "u8";
                    }
                ];
            };
        },
        {
            "name": "newsPublished";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "newsAccount";
                        "type": "pubkey";
                    },
                    {
                        "name": "author";
                        "type": "pubkey";
                    },
                    {
                        "name": "mint";
                        "type": "pubkey";
                    },
                    {
                        "name": "headline";
                        "type": "string";
                    },
                    {
                        "name": "timestamp";
                        "type": "i64";
                    }
                ];
            };
        },
        {
            "name": "newsTokenRetrieved";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "newsAccount";
                        "type": "pubkey";
                    },
                    {
                        "name": "author";
                        "type": "pubkey";
                    },
                    {
                        "name": "headline";
                        "type": "string";
                    },
                    {
                        "name": "arweaveLink";
                        "type": "string";
                    },
                    {
                        "name": "summaryLink";
                        "type": "string";
                    },
                    {
                        "name": "mint";
                        "type": "pubkey";
                    },
                    {
                        "name": "publishedAt";
                        "type": "i64";
                    },
                    {
                        "name": "timestamp";
                        "type": "i64";
                    }
                ];
            };
        },
        {
            "name": "newsTokensRequested";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "requester";
                        "type": "pubkey";
                    },
                    {
                        "name": "offset";
                        "type": "u32";
                    },
                    {
                        "name": "limit";
                        "type": "u32";
                    },
                    {
                        "name": "timestamp";
                        "type": "i64";
                    }
                ];
            };
        },
        {
            "name": "oracle";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "admin";
                        "type": "pubkey";
                    },
                    {
                        "name": "bump";
                        "type": "u8";
                    }
                ];
            };
        },
        {
            "name": "profile";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "user";
                        "type": "pubkey";
                    },
                    {
                        "name": "totalPnl";
                        "type": "i64";
                    },
                    {
                        "name": "totalVolume";
                        "type": "u64";
                    },
                    {
                        "name": "tradesCount";
                        "type": "u64";
                    },
                    {
                        "name": "wins";
                        "type": "u64";
                    },
                    {
                        "name": "trophies";
                        "type": "u64";
                    },
                    {
                        "name": "currentSeasonPnl";
                        "type": "i64";
                    },
                    {
                        "name": "lastTradeTimestamp";
                        "type": "i64";
                    },
                    {
                        "name": "bump";
                        "type": "u8";
                    }
                ];
            };
        },
        {
            "name": "profileInitialized";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "user";
                        "type": "pubkey";
                    },
                    {
                        "name": "timestamp";
                        "type": "i64";
                    }
                ];
            };
        },
        {
            "name": "rollupCommitted";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "market";
                        "type": "pubkey";
                    },
                    {
                        "name": "supply";
                        "type": "u64";
                    },
                    {
                        "name": "reserves";
                        "type": "u64";
                    }
                ];
            };
        },
        {
            "name": "season";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "seasonId";
                        "type": "u64";
                    },
                    {
                        "name": "startTimestamp";
                        "type": "i64";
                    },
                    {
                        "name": "endTimestamp";
                        "type": "i64";
                    },
                    {
                        "name": "isActive";
                        "type": "bool";
                    },
                    {
                        "name": "totalParticipants";
                        "type": "u64";
                    },
                    {
                        "name": "totalVolume";
                        "type": "u64";
                    },
                    {
                        "name": "bump";
                        "type": "u8";
                    }
                ];
            };
        },
        {
            "name": "seasonStarted";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "seasonId";
                        "type": "u64";
                    },
                    {
                        "name": "startTimestamp";
                        "type": "i64";
                    },
                    {
                        "name": "endTimestamp";
                        "type": "i64";
                    }
                ];
            };
        },
        {
            "name": "stateCommitRecommended";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "market";
                        "type": "pubkey";
                    },
                    {
                        "name": "reason";
                        "type": "string";
                    }
                ];
            };
        },
        {
            "name": "summaryUpdated";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "newsAccount";
                        "type": "pubkey";
                    },
                    {
                        "name": "summaryLink";
                        "type": "string";
                    }
                ];
            };
        },
        {
            "name": "tokensPurchased";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "buyer";
                        "type": "pubkey";
                    },
                    {
                        "name": "amount";
                        "type": "u64";
                    },
                    {
                        "name": "cost";
                        "type": "u64";
                    },
                    {
                        "name": "newSupply";
                        "type": "u64";
                    }
                ];
            };
        },
        {
            "name": "tokensSold";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "seller";
                        "type": "pubkey";
                    },
                    {
                        "name": "amount";
                        "type": "u64";
                    },
                    {
                        "name": "refund";
                        "type": "u64";
                    },
                    {
                        "name": "newSupply";
                        "type": "u64";
                    }
                ];
            };
        },
        {
            "name": "tokensStaked";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "author";
                        "type": "pubkey";
                    },
                    {
                        "name": "market";
                        "type": "pubkey";
                    },
                    {
                        "name": "amount";
                        "type": "u64";
                    },
                    {
                        "name": "totalStaked";
                        "type": "u64";
                    }
                ];
            };
        },
        {
            "name": "tokensUnstaked";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "author";
                        "type": "pubkey";
                    },
                    {
                        "name": "market";
                        "type": "pubkey";
                    },
                    {
                        "name": "amount";
                        "type": "u64";
                    },
                    {
                        "name": "totalStaked";
                        "type": "u64";
                    }
                ];
            };
        },
        {
            "name": "tradePosition";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "user";
                        "type": "pubkey";
                    },
                    {
                        "name": "market";
                        "type": "pubkey";
                    },
                    {
                        "name": "totalBought";
                        "type": "u64";
                    },
                    {
                        "name": "totalSold";
                        "type": "u64";
                    },
                    {
                        "name": "avgBuyPrice";
                        "type": "u64";
                    },
                    {
                        "name": "realizedPnl";
                        "type": "i64";
                    },
                    {
                        "name": "bump";
                        "type": "u8";
                    }
                ];
            };
        },
        {
            "name": "tradeRecorded";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "user";
                        "type": "pubkey";
                    },
                    {
                        "name": "market";
                        "type": "pubkey";
                    },
                    {
                        "name": "tradeType";
                        "type": {
                            "defined": {
                                "name": "tradeType";
                            };
                        };
                    },
                    {
                        "name": "amount";
                        "type": "u64";
                    },
                    {
                        "name": "price";
                        "type": "u64";
                    },
                    {
                        "name": "pnlDelta";
                        "type": "i64";
                    },
                    {
                        "name": "totalPnl";
                        "type": "i64";
                    },
                    {
                        "name": "seasonPnl";
                        "type": "i64";
                    }
                ];
            };
        },
        {
            "name": "tradeType";
            "type": {
                "kind": "enum";
                "variants": [
                    {
                        "name": "buy";
                    },
                    {
                        "name": "sell";
                    }
                ];
            };
        },
        {
            "name": "trophyAwarded";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "user";
                        "type": "pubkey";
                    },
                    {
                        "name": "totalTrophies";
                        "type": "u64";
                    }
                ];
            };
        },
        {
            "name": "whitelistedAuthority";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "authority";
                        "type": "pubkey";
                    },
                    {
                        "name": "isActive";
                        "type": "bool";
                    }
                ];
            };
        }
    ];
};
//# sourceMappingURL=news_platform.d.ts.map