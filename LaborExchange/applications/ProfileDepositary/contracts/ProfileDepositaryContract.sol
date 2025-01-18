// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0

// список требований к контракту:
// 

pragma solidity ^0.8.22;

import {ERC721} from "@openzeppelin/contracts@5.1.0/token/ERC721/ERC721.sol";
import {ERC721Burnable} from "@openzeppelin/contracts@5.1.0/token/ERC721/extensions/ERC721Burnable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts@5.1.0/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts@5.1.0/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts@5.1.0/token/ERC721/IERC721.sol";

/// @custom:security-contact eagantaev@gmail.com
contract ProfileDepositaryContract is Ownable 
{
    IERC721 public profileNFTContract;
    mapping(uint256 => address) public depositedNFTs;
    uint256[] public depositedTokenIds;

    event NFTDeposited(address indexed owner, uint256 tokenId);
    event NFTWithdrawn(address indexed owner, uint256 tokenId);

    constructor(address _profileNFTContractAddress) Ownable(msg.sender) 
    {
        require(_profileNFTContractAddress != address(0), "Zero address not allowed");
        profileNFTContract = IERC721(_profileNFTContractAddress);
    }

    function depositProfile(uint256 _tokenId) external 
    {
        require(profileNFTContract.ownerOf(_tokenId) == msg.sender, "Not the owner");
        require(depositedNFTs[_tokenId] == address(0), "Already deposited");

        //profileNFTContract.safeTransferFrom(msg.sender, address(this), _tokenId);
        depositedNFTs[_tokenId] = msg.sender;
        depositedTokenIds.push(_tokenId);

        emit NFTDeposited(msg.sender, _tokenId);
    }

    function withdrawProfile(uint256 _tokenId) external 
    {
        require(depositedNFTs[_tokenId] != address(0), "Not deposited");
        require(depositedNFTs[_tokenId] == msg.sender, "Not the depositor");

        //profileNFTContract.safeTransferFrom(address(this), msg.sender, _tokenId);
        delete depositedNFTs[_tokenId];
        _removeTokenFromArray(_tokenId);

        emit NFTWithdrawn(msg.sender, _tokenId);
    }

    function _removeTokenFromArray(uint256 _tokenId) private 
    {
        uint256 lastIndex = depositedTokenIds.length - 1;
        for (uint256 i = 0; i < depositedTokenIds.length; i++) {
            if (depositedTokenIds[i] == _tokenId) {
                depositedTokenIds[i] = depositedTokenIds[lastIndex];
                depositedTokenIds.pop();
                break;
            }
        }
    }

    function getDepositedProfileIds() external view returns (uint256[] memory) 
    {
        return depositedTokenIds;   
    }

    function getDepositedProfileOwner(uint256 _tokenId) external view returns (address) 
    {
        return depositedNFTs[_tokenId];
    }

}
